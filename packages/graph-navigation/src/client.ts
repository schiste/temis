type NodePosition = {
  x: number;
  y: number;
};

type NodeMeasure = {
  height: number;
  width: number;
};

type DragState = {
  hasMoved: boolean;
  mapHeight: number;
  mapWidth: number;
  node: HTMLElement;
  nodeId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

type CollisionOptions = {
  resetToNatural?: boolean;
  updateNatural?: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value * 100) / 100;

const hashText = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const seededUnit = (id: string, salt: string) =>
  hashText(`${id}:${salt}`) / 0xffffffff;

const seededSignedUnit = (id: string, salt: string) =>
  seededUnit(id, salt) >= 0.5 ? 1 : -1;

function numericDatasetValue(
  node: HTMLElement,
  key: "nodeX" | "nodeY",
  fallback: number,
) {
  const value = Number.parseFloat(node.dataset[key] ?? "");
  return Number.isFinite(value) ? value : fallback;
}

function readInitialPosition(node: HTMLElement): NodePosition {
  return {
    x: numericDatasetValue(node, "nodeX", 50),
    y: numericDatasetValue(node, "nodeY", 50),
  };
}

function clampAxis(value: number, min: number, max: number) {
  return max <= min ? 50 : clamp(value, min, max);
}

function measureNode(node: HTMLElement, mapRect: DOMRect): NodeMeasure {
  return {
    height: (node.offsetHeight / mapRect.height) * 100,
    width: (node.offsetWidth / mapRect.width) * 100,
  };
}

function clampNodePosition(
  node: HTMLElement,
  position: NodePosition,
  mapRect: DOMRect,
  measure = measureNode(node, mapRect),
): NodePosition {
  const gutterX = Math.max(1.2, (6 / mapRect.width) * 100);
  const gutterY = Math.max(1.2, (6 / mapRect.height) * 100);

  return {
    x: round(
      clampAxis(
        position.x,
        measure.width / 2 + gutterX,
        100 - measure.width / 2 - gutterX,
      ),
    ),
    y: round(
      clampAxis(
        position.y,
        measure.height / 2 + gutterY,
        100 - measure.height / 2 - gutterY,
      ),
    ),
  };
}

function edgeCurvePath(
  edgeId: string,
  source: NodePosition,
  target: NodePosition,
) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy) || 1;
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const bend =
    Math.min(5.2, Math.max(1.8, distance * 0.08)) *
    seededSignedUnit(edgeId, "curve-side") *
    (0.78 + seededUnit(edgeId, "curve-weight") * 0.44);
  const controlX = round((source.x + target.x) / 2 + normalX * bend);
  const controlY = round((source.y + target.y) / 2 + normalY * bend);

  return `M ${round(source.x)} ${round(source.y)} Q ${controlX} ${controlY} ${round(target.x)} ${round(target.y)}`;
}

function previewPlacementX(x: number) {
  return x > 66 ? "left" : "right";
}

function previewPlacementY(y: number) {
  if (y > 70) return "up";
  if (y < 30) return "down";
  return "middle";
}

function mountGraphNavigation(graph: HTMLElement) {
  if (graph.dataset.graphMounted === "true") return;
  graph.dataset.graphMounted = "true";

  const nodes = [...graph.querySelectorAll<HTMLElement>("[data-node-id]")];
  const indexLinks = [
    ...graph.querySelectorAll<HTMLElement>("[data-index-node-id]"),
  ];
  const edges = [
    ...graph.querySelectorAll<SVGPathElement>("[data-edge-source]"),
  ];
  const detailPanels = [
    ...graph.querySelectorAll<HTMLElement>("[data-detail-node-id]"),
  ];
  const map = graph.querySelector<HTMLElement>(".temis-graph-nav__map");
  const previewPanels = [
    ...graph.querySelectorAll<HTMLElement>("[data-preview-node-id]"),
  ];
  const modeButtons = [
    ...graph.querySelectorAll<HTMLButtonElement>("[data-graph-mode-button]"),
  ];
  const typeFilters = [
    ...graph.querySelectorAll<HTMLInputElement>("[data-graph-type-filter]"),
  ];
  const nodeById = new Map(
    nodes.flatMap((node) =>
      node.dataset.nodeId ? [[node.dataset.nodeId, node] as const] : [],
    ),
  );
  const previewById = new Map(
    previewPanels.flatMap((panel) =>
      panel.dataset.previewNodeId
        ? [[panel.dataset.previewNodeId, panel] as const]
        : [],
    ),
  );
  const neighbors = new Map<string, Set<string>>();
  const activePositions = new Map<string, NodePosition>();
  const naturalPositions = new Map<string, NodePosition>();
  const hasDetails = detailPanels.length > 0;
  const initialNodeId =
    nodes.find((node) => node.getAttribute("aria-expanded") === "true")?.dataset
      .nodeId ??
    detailPanels.find((panel) => !panel.hidden)?.dataset.detailNodeId ??
    nodes[0]?.dataset.nodeId ??
    null;
  let dragState: DragState | null = null;
  let lockedNodeId: string | null = null;
  let resizeFrame = 0;
  let suppressClickNodeId: string | null = null;
  let activeTypeFilters = new Set(
    typeFilters
      .filter((filter) => filter.checked)
      .map((filter) => filter.dataset.graphTypeFilter)
      .filter((type): type is string => Boolean(type)),
  );

  const mode = () => graph.dataset.graphMode ?? "overview";

  const modesForNode = (node: HTMLElement) =>
    new Set((node.dataset.nodeModes ?? "").split(/\s+/).filter(Boolean));

  const modesForEdge = (edge: SVGPathElement) =>
    new Set((edge.dataset.edgeModes ?? "").split(/\s+/).filter(Boolean));

  const visibleByFilter = (node: HTMLElement) =>
    typeFilters.length === 0 ||
    activeTypeFilters.has(node.dataset.nodeType ?? "");

  const visibleByMode = (node: HTMLElement) => {
    const currentMode = mode();
    if (currentMode === "content") return modesForNode(node).has("content");
    if (currentMode === "overview") return modesForNode(node).has("overview");

    const nodeId = node.dataset.nodeId;
    const focusNodeId =
      lockedNodeId ?? graph.dataset.graphActive ?? initialNodeId;
    if (!nodeId || !focusNodeId) return modesForNode(node).has("overview");
    return (
      nodeId === focusNodeId || Boolean(neighbors.get(focusNodeId)?.has(nodeId))
    );
  };

  const visibleNodeIds = () =>
    new Set(
      nodes
        .filter((node) => !node.hidden)
        .map((node) => node.dataset.nodeId)
        .filter((nodeId): nodeId is string => Boolean(nodeId)),
    );

  const applyPreviewPosition = (nodeId: string, position: NodePosition) => {
    const panel = previewById.get(nodeId);
    if (!panel) return;

    panel.style.setProperty("--preview-x", String(round(position.x)));
    panel.style.setProperty("--preview-y", String(round(position.y)));
    panel.dataset.previewPlacementX = previewPlacementX(position.x);
    panel.dataset.previewPlacementY = previewPlacementY(position.y);
  };

  const applyNodePosition = (node: HTMLElement, position: NodePosition) => {
    const nodeId = node.dataset.nodeId;
    if (!nodeId) return;

    activePositions.set(nodeId, position);
    node.dataset.nodeAnchorX = "middle";
    node.dataset.nodeAnchorY = "middle";
    node.style.setProperty("--node-x", String(round(position.x)));
    node.style.setProperty("--node-y", String(round(position.y)));
    applyPreviewPosition(nodeId, position);
  };

  const getNodePosition = (nodeId: string): NodePosition => {
    const existingPosition = activePositions.get(nodeId);
    if (existingPosition) return existingPosition;

    const node = nodeById.get(nodeId);
    const initialPosition = node ? readInitialPosition(node) : { x: 50, y: 50 };
    activePositions.set(nodeId, initialPosition);
    return initialPosition;
  };

  const redrawEdges = () => {
    for (const edge of edges) {
      const source = edge.dataset.edgeSource;
      const target = edge.dataset.edgeTarget;
      if (!source || !target) continue;

      edge.setAttribute(
        "d",
        edgeCurvePath(
          edge.dataset.edgeId ?? `${source}:${target}`,
          getNodePosition(source),
          getNodePosition(target),
        ),
      );
    }
  };

  const resolveLabelCollisions = (
    pinnedNodeId: string | null = null,
    options: CollisionOptions = {},
  ) => {
    if (!map || nodes.length === 0) return;

    const mapRect = map.getBoundingClientRect();
    if (mapRect.width <= 0 || mapRect.height <= 0) return;

    const measures = new Map<HTMLElement, NodeMeasure>();
    const positions = new Map<string, NodePosition>();

    for (const node of nodes) {
      if (node.hidden) continue;
      const nodeId = node.dataset.nodeId;
      if (!nodeId) continue;

      node.dataset.nodeAnchorX = "middle";
      node.dataset.nodeAnchorY = "middle";
      const measure = measureNode(node, mapRect);
      const basePosition = options.resetToNatural
        ? (naturalPositions.get(nodeId) ?? readInitialPosition(node))
        : getNodePosition(nodeId);
      const position = clampNodePosition(node, basePosition, mapRect, measure);
      measures.set(node, measure);
      positions.set(nodeId, position);
    }

    const gapX = Math.max(1.8, (8 / mapRect.width) * 100);
    const gapY = Math.max(1.8, (8 / mapRect.height) * 100);

    const moveNode = (node: HTMLElement, delta: NodePosition) => {
      const nodeId = node.dataset.nodeId;
      const measure = measures.get(node);
      const position = nodeId ? positions.get(nodeId) : null;
      if (!nodeId || !measure || !position) return;

      positions.set(
        nodeId,
        clampNodePosition(
          node,
          { x: position.x + delta.x, y: position.y + delta.y },
          mapRect,
          measure,
        ),
      );
    };

    for (let iteration = 0; iteration < 72; iteration += 1) {
      let moved = false;

      for (let aIndex = 0; aIndex < nodes.length; aIndex += 1) {
        const nodeA = nodes[aIndex];
        if (nodeA.hidden) continue;
        const idA = nodeA.dataset.nodeId;
        const measureA = measures.get(nodeA);
        const positionA = idA ? positions.get(idA) : null;
        if (!idA || !measureA || !positionA) continue;

        for (let bIndex = aIndex + 1; bIndex < nodes.length; bIndex += 1) {
          const nodeB = nodes[bIndex];
          if (nodeB.hidden) continue;
          const idB = nodeB.dataset.nodeId;
          const measureB = measures.get(nodeB);
          const positionB = idB ? positions.get(idB) : null;
          if (!idB || !measureB || !positionB) continue;

          const deltaX = positionA.x - positionB.x;
          const deltaY = positionA.y - positionB.y;
          const overlapX =
            (measureA.width + measureB.width) / 2 + gapX - Math.abs(deltaX);
          const overlapY =
            (measureA.height + measureB.height) / 2 + gapY - Math.abs(deltaY);

          if (overlapX <= 0 || overlapY <= 0) continue;

          const separateOnX = overlapX < overlapY;
          const tieDirection = idA.localeCompare(idB) <= 0 ? -1 : 1;
          const direction = separateOnX
            ? deltaX === 0
              ? tieDirection
              : Math.sign(deltaX)
            : deltaY === 0
              ? tieDirection
              : Math.sign(deltaY);
          const amount = separateOnX ? overlapX : overlapY;
          const aPinned = idA === pinnedNodeId;
          const bPinned = idB === pinnedNodeId;

          if (aPinned && bPinned) continue;

          if (separateOnX) {
            if (aPinned) {
              moveNode(nodeB, { x: -direction * amount, y: 0 });
            } else if (bPinned) {
              moveNode(nodeA, { x: direction * amount, y: 0 });
            } else {
              moveNode(nodeA, { x: direction * (amount / 2), y: 0 });
              moveNode(nodeB, { x: -direction * (amount / 2), y: 0 });
            }
          } else if (aPinned) {
            moveNode(nodeB, { x: 0, y: -direction * amount });
          } else if (bPinned) {
            moveNode(nodeA, { x: 0, y: direction * amount });
          } else {
            moveNode(nodeA, { x: 0, y: direction * (amount / 2) });
            moveNode(nodeB, { x: 0, y: -direction * (amount / 2) });
          }

          moved = true;
        }
      }

      if (!moved) break;
    }

    for (const node of nodes) {
      if (node.hidden) continue;
      const nodeId = node.dataset.nodeId;
      const position = nodeId ? positions.get(nodeId) : null;
      if (!nodeId || !position) continue;

      applyNodePosition(node, position);
      if (options.updateNatural !== false) {
        naturalPositions.set(nodeId, position);
      }
    }

    redrawEdges();
  };

  const scheduleCollisionPass = (options: CollisionOptions = {}) => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      resolveLabelCollisions(dragState?.nodeId ?? null, options);
    });
  };

  const setExpandedNode = (nodeId: string | null) => {
    for (const node of nodes) {
      if (!hasDetails) {
        node.removeAttribute("aria-expanded");
        continue;
      }

      node.setAttribute(
        "aria-expanded",
        node.dataset.nodeId === nodeId ? "true" : "false",
      );
    }

    for (const indexLink of indexLinks) {
      if (!hasDetails) {
        indexLink.removeAttribute("aria-expanded");
        continue;
      }

      indexLink.setAttribute(
        "aria-expanded",
        indexLink.dataset.indexNodeId === nodeId ? "true" : "false",
      );
    }
  };

  const applyModeButtons = () => {
    for (const button of modeButtons) {
      button.setAttribute(
        "aria-pressed",
        button.dataset.graphModeButton === mode() ? "true" : "false",
      );
    }
  };

  for (const node of nodes) {
    const nodeId = node.dataset.nodeId;
    if (!nodeId) continue;
    neighbors.set(nodeId, new Set());
    const initialPosition = readInitialPosition(node);
    activePositions.set(nodeId, initialPosition);
    naturalPositions.set(nodeId, initialPosition);
  }

  for (const edge of edges) {
    const source = edge.dataset.edgeSource;
    const target = edge.dataset.edgeTarget;
    if (!source || !target) continue;
    neighbors.get(source)?.add(target);
    neighbors.get(target)?.add(source);
  }

  const showDetailPanel = (nodeId: string) => {
    for (const panel of detailPanels) {
      panel.hidden = panel.dataset.detailNodeId !== nodeId;
    }
  };

  const hidePreviewPanels = () => {
    for (const panel of previewPanels) {
      panel.hidden = true;
    }
  };

  const showPreviewPanel = (nodeId: string) => {
    for (const panel of previewPanels) {
      panel.hidden = panel.dataset.previewNodeId !== nodeId;
    }
  };

  const applyVisibility = () => {
    const currentMode = mode();
    const activeNodeId =
      graph.dataset.graphActive ?? lockedNodeId ?? initialNodeId;

    for (const node of nodes) {
      node.hidden = !visibleByFilter(node) || !visibleByMode(node);
    }

    const visibleIds = visibleNodeIds();
    for (const edge of edges) {
      const source = edge.dataset.edgeSource;
      const target = edge.dataset.edgeTarget;
      const visible =
        Boolean(
          source && target && visibleIds.has(source) && visibleIds.has(target),
        ) &&
        (currentMode === "focus"
          ? source === activeNodeId || target === activeNodeId
          : modesForEdge(edge).has(currentMode));
      edge.toggleAttribute("hidden", !visible);
    }

    for (const panel of previewPanels) {
      const nodeId = panel.dataset.previewNodeId;
      if (nodeId && !visibleIds.has(nodeId)) panel.hidden = true;
    }

    applyModeButtons();
    scheduleCollisionPass({
      resetToNatural: !dragState,
      updateNatural: !dragState,
    });
  };

  const clearGraphState = () => {
    graph.removeAttribute("data-graph-active");
    setExpandedNode(initialNodeId);
    if (hasDetails && initialNodeId) showDetailPanel(initialNodeId);
    hidePreviewPanels();
    for (const node of nodes) node.removeAttribute("data-graph-state");
    for (const edge of edges) edge.removeAttribute("data-graph-state");
    for (const indexLink of indexLinks) {
      indexLink.removeAttribute("data-index-state");
    }
    applyVisibility();
  };

  const activateNode = (nodeId: string) => {
    const activeNode = nodeById.get(nodeId);
    if (
      activeNode &&
      (!visibleByFilter(activeNode) || !visibleByMode(activeNode))
    ) {
      return;
    }

    const relatedNodes = neighbors.get(nodeId) ?? new Set();
    graph.dataset.graphActive = nodeId;
    setExpandedNode(nodeId);
    if (hasDetails) showDetailPanel(nodeId);

    for (const node of nodes) {
      const currentNodeId = node.dataset.nodeId;
      if (currentNodeId === nodeId) {
        node.dataset.graphState = "active";
      } else if (currentNodeId && relatedNodes.has(currentNodeId)) {
        node.dataset.graphState = "neighbor";
      } else {
        node.removeAttribute("data-graph-state");
      }
    }

    for (const indexLink of indexLinks) {
      const currentNodeId = indexLink.dataset.indexNodeId;
      if (currentNodeId === nodeId) {
        indexLink.dataset.indexState = "active";
      } else if (currentNodeId && relatedNodes.has(currentNodeId)) {
        indexLink.dataset.indexState = "neighbor";
      } else {
        indexLink.removeAttribute("data-index-state");
      }
    }

    for (const edge of edges) {
      const source = edge.dataset.edgeSource;
      const target = edge.dataset.edgeTarget;
      if (source === nodeId || target === nodeId) {
        edge.dataset.graphState = "related";
      } else {
        edge.removeAttribute("data-graph-state");
      }
    }

    applyVisibility();
  };

  const unlock = () => {
    lockedNodeId = null;
    graph.removeAttribute("data-graph-locked");
    clearGraphState();
  };

  const lockNode = (nodeId: string) => {
    lockedNodeId = nodeId;
    graph.dataset.graphLocked = nodeId;
    activateNode(nodeId);
    showPreviewPanel(nodeId);
  };

  const setMode = (nextMode: string) => {
    graph.dataset.graphMode = nextMode;

    if (nextMode === "focus") {
      const focusNodeId =
        lockedNodeId ?? graph.dataset.graphActive ?? initialNodeId;
      if (focusNodeId) activateNode(focusNodeId);
      else applyVisibility();
      return;
    }

    if (lockedNodeId) {
      activateNode(lockedNodeId);
    } else {
      clearGraphState();
    }
  };

  for (const button of modeButtons) {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.graphModeButton;
      if (!nextMode) return;
      setMode(nextMode);
    });
  }

  for (const filter of typeFilters) {
    filter.addEventListener("change", () => {
      activeTypeFilters = new Set(
        typeFilters
          .filter((item) => item.checked)
          .map((item) => item.dataset.graphTypeFilter)
          .filter((type): type is string => Boolean(type)),
      );
      const lockedNode = lockedNodeId ? nodeById.get(lockedNodeId) : null;
      if (lockedNode && !visibleByFilter(lockedNode)) {
        unlock();
      } else {
        applyVisibility();
      }
    });
  }

  for (const panel of previewPanels) {
    const closeButton = panel.querySelector<HTMLButtonElement>("button");
    closeButton?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      unlock();
      graph.focus({ preventScroll: true });
    });
  }

  for (const node of nodes) {
    node.addEventListener("pointerdown", (event) => {
      const nodeId = node.dataset.nodeId;
      if (
        !nodeId ||
        !map ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const mapRect = map.getBoundingClientRect();
      if (mapRect.width <= 0 || mapRect.height <= 0) return;

      const position = getNodePosition(nodeId);
      dragState = {
        hasMoved: false,
        mapHeight: mapRect.height,
        mapWidth: mapRect.width,
        node,
        nodeId,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: position.x,
        startY: position.y,
      };
      node.setPointerCapture(event.pointerId);
    });

    node.addEventListener("pointermove", (event) => {
      if (
        !dragState ||
        dragState.node !== node ||
        dragState.pointerId !== event.pointerId ||
        !map
      ) {
        return;
      }

      const deltaClientX = event.clientX - dragState.startClientX;
      const deltaClientY = event.clientY - dragState.startClientY;
      if (!dragState.hasMoved && Math.hypot(deltaClientX, deltaClientY) < 4) {
        return;
      }

      event.preventDefault();
      dragState.hasMoved = true;
      graph.dataset.graphDragging = dragState.nodeId;
      node.dataset.nodeDragging = "true";
      hidePreviewPanels();
      activateNode(dragState.nodeId);

      const mapRect = map.getBoundingClientRect();
      const nextPosition = clampNodePosition(
        node,
        {
          x: dragState.startX + (deltaClientX / dragState.mapWidth) * 100,
          y: dragState.startY + (deltaClientY / dragState.mapHeight) * 100,
        },
        mapRect,
      );
      applyNodePosition(node, nextPosition);
      resolveLabelCollisions(dragState.nodeId, { updateNatural: false });
    });

    const endDrag = (event: PointerEvent) => {
      if (
        !dragState ||
        dragState.node !== node ||
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      const moved = dragState.hasMoved;
      if (node.hasPointerCapture(event.pointerId)) {
        node.releasePointerCapture(event.pointerId);
      }
      node.removeAttribute("data-node-dragging");
      graph.removeAttribute("data-graph-dragging");
      dragState = null;
      resolveLabelCollisions(null, { updateNatural: false });

      if (!moved) return;

      event.preventDefault();
      suppressClickNodeId = node.dataset.nodeId ?? null;
      if (!lockedNodeId) clearGraphState();
      window.setTimeout(() => {
        suppressClickNodeId = null;
      }, 0);
    };

    node.addEventListener("pointerup", endDrag);
    node.addEventListener("pointercancel", endDrag);

    node.addEventListener("pointerenter", () => {
      if (lockedNodeId || dragState) return;
      const nodeId = node.dataset.nodeId;
      if (nodeId) activateNode(nodeId);
    });

    node.addEventListener("pointerleave", () => {
      if (dragState) return;
      if (!lockedNodeId) clearGraphState();
    });

    node.addEventListener("focus", () => {
      if (lockedNodeId) return;
      const nodeId = node.dataset.nodeId;
      if (nodeId) activateNode(nodeId);
    });

    node.addEventListener("blur", () => {
      if (!lockedNodeId) clearGraphState();
    });

    node.addEventListener("click", (event) => {
      const nodeId = node.dataset.nodeId;
      if (!nodeId) return;

      if (suppressClickNodeId === nodeId) {
        event.preventDefault();
        suppressClickNodeId = null;
        return;
      }

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      lockNode(nodeId);
    });
  }

  for (const indexLink of indexLinks) {
    indexLink.addEventListener("pointerenter", () => {
      if (lockedNodeId) return;
      const nodeId = indexLink.dataset.indexNodeId;
      if (nodeId) activateNode(nodeId);
    });

    indexLink.addEventListener("pointerleave", () => {
      if (!lockedNodeId) clearGraphState();
    });

    indexLink.addEventListener("focus", () => {
      if (lockedNodeId) return;
      const nodeId = indexLink.dataset.indexNodeId;
      if (nodeId) activateNode(nodeId);
    });

    indexLink.addEventListener("blur", () => {
      if (!lockedNodeId) clearGraphState();
    });

    indexLink.addEventListener("click", (event) => {
      const nodeId = indexLink.dataset.indexNodeId;
      if (!nodeId) return;

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      lockNode(nodeId);
    });
  }

  graph.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    unlock();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!lockedNodeId || graph.contains(event.target as Node)) return;
    unlock();
  });

  if (map && "ResizeObserver" in window) {
    new ResizeObserver(() => {
      scheduleCollisionPass({
        resetToNatural: !dragState,
        updateNatural: !dragState,
      });
    }).observe(map);
  } else {
    window.addEventListener("resize", () => {
      scheduleCollisionPass({
        resetToNatural: !dragState,
        updateNatural: !dragState,
      });
    });
  }

  applyVisibility();
  document.fonts?.ready
    .then(() => {
      scheduleCollisionPass({
        resetToNatural: !dragState,
        updateNatural: !dragState,
      });
    })
    .catch(() => {
      // Font readiness is a progressive enhancement for label measurement.
    });
}

export function mountGraphNavigations(root: ParentNode = document) {
  const graphs = root.querySelectorAll<HTMLElement>(".temis-graph-nav");

  for (const graph of graphs) {
    mountGraphNavigation(graph);
  }
}
