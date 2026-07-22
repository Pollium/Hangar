import { create } from 'zustand';

/** What a pane renders. `null` content = an empty pane showing the picker. */
export type PaneContent =
    | { kind: 'terminal'; sessionId: number }
    | { kind: 'codespace'; projectId: number; filePath?: string };

export type SplitDir = 'row' | 'col';

export interface LeafNode{
    type: 'leaf';
    id: string;
    content: PaneContent | null;
}

export interface SplitNode{
    type: 'split';
    id: string;
    dir: SplitDir;
    children: WorkspaceNode[];
}

export type WorkspaceNode = LeafNode | SplitNode;

const sameContent = (left: PaneContent | null, right: PaneContent | null): boolean => {
    if(!left || !right) return left === right;
    if(left.kind === 'terminal' && right.kind === 'terminal') return left.sessionId === right.sessionId;
    if(left.kind === 'codespace' && right.kind === 'codespace') return left.projectId === right.projectId;
    return false;
};

const firstLeaf = (node: WorkspaceNode): LeafNode =>
    node.type === 'leaf' ? node : firstLeaf(node.children[0]);

const findLeaf = (node: WorkspaceNode, id: string): LeafNode | null => {
    if(node.type === 'leaf') return node.id === id ? node : null;
    for(const child of node.children){
        const found = findLeaf(child, id);
        if(found) return found;
    }
    return null;
};

const findContent = (node: WorkspaceNode, content: PaneContent): LeafNode | null => {
    if(node.type === 'leaf') return sameContent(node.content, content) ? node : null;
    for(const child of node.children){
        const found = findContent(child, content);
        if(found) return found;
    }
    return null;
};

/** Replace one node (by id) with another, rebuilding the path to it immutably. */
const replaceNode = (node: WorkspaceNode, id: string, next: WorkspaceNode): WorkspaceNode => {
    if(node.id === id) return next;
    if(node.type === 'leaf') return node;
    return { ...node, children: node.children.map((child) => replaceNode(child, id, next)) };
};

/** Set a leaf's content, rebuilding the path to it immutably. */
const setLeafContent = (node: WorkspaceNode, id: string, content: PaneContent | null): WorkspaceNode => {
    if(node.type === 'leaf') return node.id === id ? { ...node, content } : node;
    return { ...node, children: node.children.map((child) => setLeafContent(child, id, content)) };
};

/** Drop a leaf; collapse any split left with a single child. Returns null if the tree empties. */
const removeLeaf = (node: WorkspaceNode, id: string): WorkspaceNode | null => {
    if(node.type === 'leaf') return node.id === id ? null : node;
    const children = node.children
        .map((child) => removeLeaf(child, id))
        .filter((child): child is WorkspaceNode => child !== null);
    if(children.length === 0) return null;
    if(children.length === 1) return children[0];
    return { ...node, children };
};

interface WorkspaceState{
    root: WorkspaceNode | null;
    activeLeafId: string | null;
    setActive: (leafId: string) => void;
    /** Focus an existing pane showing this content, else fill the active pane (creating the first). */
    openContent: (content: PaneContent) => void;
    /** Open the project's codespace focused on a file — reuses its pane, navigating to the file. */
    openCodespaceAt: (projectId: number, filePath: string) => void;
    /** Set a specific pane's content (used by the empty-pane picker) and focus it. */
    assign: (leafId: string, content: PaneContent) => void;
    /** Split the active pane; the new sibling (optionally seeded) becomes active. */
    split: (dir: SplitDir, content?: PaneContent | null) => void;
    /** Close a pane and refocus a remaining one. */
    close: (leafId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => {
    let counter = 0;
    const nextId = (): string => {
        counter += 1;
        return `pane-${counter}`;
    };
    const makeLeaf = (content: PaneContent | null): LeafNode => ({ type: 'leaf', id: nextId(), content });

    return {
        root: null,
        activeLeafId: null,

        setActive: (leafId) => set({ activeLeafId: leafId }),

        openContent: (content) => set((state) => {
            if(!state.root){
                const leaf = makeLeaf(content);
                return { root: leaf, activeLeafId: leaf.id };
            }
            const existing = findContent(state.root, content);
            if(existing) return { activeLeafId: existing.id };

            const targetId = (state.activeLeafId && findLeaf(state.root, state.activeLeafId)?.id)
                || firstLeaf(state.root).id;
            return {
                root: setLeafContent(state.root, targetId, content),
                activeLeafId: targetId
            };
        }),

        openCodespaceAt: (projectId, filePath) => set((state) => {
            const content: PaneContent = { kind: 'codespace', projectId, filePath };
            if(!state.root){
                const leaf = makeLeaf(content);
                return { root: leaf, activeLeafId: leaf.id };
            }
            // Reuse the project's codespace pane if open (matched by projectId), replacing its
            // content so the file changes; otherwise fill the active pane.
            const existing = findContent(state.root, { kind: 'codespace', projectId });
            const targetId = existing?.id
                || (state.activeLeafId && findLeaf(state.root, state.activeLeafId)?.id)
                || firstLeaf(state.root).id;
            return {
                root: setLeafContent(state.root, targetId, content),
                activeLeafId: targetId
            };
        }),

        assign: (leafId, content) => set((state) => (
            state.root
                ? { root: setLeafContent(state.root, leafId, content), activeLeafId: leafId }
                : state
        )),

        split: (dir, content = null) => set((state) => {
            const leaf = makeLeaf(content);
            if(!state.root) return { root: leaf, activeLeafId: leaf.id };

            const targetId = (state.activeLeafId && findLeaf(state.root, state.activeLeafId)?.id)
                || firstLeaf(state.root).id;
            const target = findLeaf(state.root, targetId);
            if(!target) return state;

            const branch: SplitNode = { type: 'split', id: nextId(), dir, children: [target, leaf] };
            return {
                root: replaceNode(state.root, targetId, branch),
                activeLeafId: leaf.id
            };
        }),

        close: (leafId) => {
            const { root } = get();
            if(!root) return;
            const next = removeLeaf(root, leafId);
            set({
                root: next,
                activeLeafId: next ? firstLeaf(next).id : null
            });
        }
    };
});
