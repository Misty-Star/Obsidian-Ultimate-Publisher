import { vi } from "vitest";

export interface CachedMetadata {
  frontmatter?: Record<string, unknown>;
}

type EventHandler = (event?: unknown) => unknown;

export class FakeElement {
  readonly children: FakeElement[] = [];
  readonly listeners = new Map<string, EventHandler[]>();
  readonly attributes = new Map<string, string>();
  readonly style: Record<string, string> = {};
  className = "";
  textContent = "";
  disabled = false;
  checked = false;
  value = "";
  type = "";
  name = "";
  inputEl = this;
  parentElement: FakeElement | null = null;
  private rect = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
  };

  constructor(
    readonly tagName = "div",
    options?: {
      text?: string;
      cls?: string;
      type?: string;
    }
  ) {
    if (options?.text) {
      this.textContent = options.text;
    }
    if (options?.cls) {
      this.className = options.cls;
    }
    if (options?.type) {
      this.type = options.type;
    }
  }

  empty(): void {
    this.children.splice(0, this.children.length);
    this.textContent = "";
  }

  createDiv(options?: { text?: string; cls?: string }): FakeElement {
    return this.createEl("div", options);
  }

  createSpan(options?: { text?: string; cls?: string }): FakeElement {
    return this.createEl("span", options);
  }

  createEl(
    tagName: string,
    options?: {
      text?: string;
      cls?: string;
      type?: string;
    }
  ): FakeElement {
    const child = new FakeElement(tagName, options);
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  createFragment(callback: (fragment: FakeElement) => void): FakeElement {
    const fragment = new FakeElement("fragment");
    callback(fragment);
    for (const child of fragment.children) {
      child.parentElement = this;
      this.children.push(child);
    }
    return fragment;
  }

  appendText(text: string): void {
    this.textContent += text;
  }

  appendChild(child: FakeElement): FakeElement {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  setText(text: string): void {
    this.textContent = text;
  }

  addClass(...classes: string[]): void {
    const next = new Set(this.className.split(/\s+/).filter(Boolean));
    for (const cls of classes) {
      next.add(cls);
    }
    this.className = Array.from(next).join(" ");
  }

  removeClass(...classes: string[]): void {
    const remove = new Set(classes);
    this.className = this.className
      .split(/\s+/)
      .filter((cls) => cls && !remove.has(cls))
      .join(" ");
  }

  toggleClass(cls: string, enabled: boolean): void {
    if (enabled) {
      this.addClass(cls);
      return;
    }
    this.removeClass(cls);
  }

  addEventListener(type: string, handler: EventHandler): void {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  removeEventListener(type: string, handler: EventHandler): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((candidate) => candidate !== handler));
  }

  dispatchEvent(type: string, event?: unknown): void {
    for (const handler of this.listeners.get(type) ?? []) {
      handler(event);
    }
  }

  click(): void {
    this.dispatchEvent("click", { currentTarget: this, target: this });
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  contains(node: unknown): boolean {
    if (node === this) {
      return true;
    }

    return this.children.some((child) => child.contains(node));
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const results: FakeElement[] = [];

    for (const child of this.children) {
      if (matchesSelector(child, selector)) {
        results.push(child);
      }
      results.push(...child.querySelectorAll(selector));
    }

    return results;
  }

  getBoundingClientRect(): {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  } {
    return { ...this.rect };
  }

  setBoundingClientRect(
    rect: Partial<{
      left: number;
      right: number;
      top: number;
      bottom: number;
      width: number;
      height: number;
    }>
  ): this {
    this.rect = {
      ...this.rect,
      ...rect,
    };

    if (rect.left !== undefined && rect.width !== undefined) {
      this.rect.right = rect.left + rect.width;
    }
    if (rect.right !== undefined && rect.left !== undefined) {
      this.rect.width = rect.right - rect.left;
    }
    if (rect.top !== undefined && rect.height !== undefined) {
      this.rect.bottom = rect.top + rect.height;
    }
    if (rect.bottom !== undefined && rect.top !== undefined) {
      this.rect.height = rect.bottom - rect.top;
    }

    return this;
  }

  detach(): void {
    this.remove();
  }

  remove(): void {
    if (!this.parentElement) {
      return;
    }

    const siblings = this.parentElement.children;
    const index = siblings.indexOf(this);
    if (index >= 0) {
      siblings.splice(index, 1);
    }
    this.parentElement = null;
  }
}

function matchesSelector(element: FakeElement, selector: string): boolean {
  const trimmed = selector.trim();
  if (!trimmed) {
    return false;
  }

  const classMatches = [...trimmed.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((match) => match[1]);
  if (classMatches.some((cls) => !element.className.split(/\s+/).includes(cls))) {
    return false;
  }

  const attributeMatches = [...trimmed.matchAll(/\[([^=\]]+)="([^"]*)"\]/g)];
  if (attributeMatches.some(([, name, value]) => element.getAttribute(name) !== value)) {
    return false;
  }

  const tagMatch = trimmed.match(/^[a-zA-Z0-9_-]+/);
  if (tagMatch && element.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) {
    return false;
  }

  return true;
}

export interface App {
  vault: {
    cachedRead(path: unknown): Promise<string>;
    modify?(file: TFile, data: string): Promise<void>;
    on?(type: string, callback: (file: TFile) => unknown): unknown;
    adapter?: {
      readBinary(path: string): Promise<ArrayBuffer | Uint8Array | Buffer>;
    };
  };
  metadataCache: {
    getFileCache(file: unknown): CachedMetadata | null;
    getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null;
  };
  workspace: {
    getActiveViewOfType(type: unknown): MarkdownView | null;
    getActiveFile(): TFile | null;
    getLeavesOfType(viewType: string): WorkspaceLeaf[];
    getRightLeaf(split: boolean): WorkspaceLeaf | null;
    revealLeaf(leaf: WorkspaceLeaf): Promise<void>;
    viewCreators?: Record<string, (leaf: WorkspaceLeaf) => unknown>;
  };
  setting?: {
    open(): void;
    openTabById(id: string): void;
  };
}

export class TFile {
  path = "";
  name = "";
  basename = "";
  extension = "";

  constructor(init?: Partial<TFile>) {
    Object.assign(this, init);
  }
}

export class MarkdownView {
  constructor(public readonly file: TFile | null = null) {}
}

export class Notice {
  static readonly instances: Notice[] = [];

  constructor(
    public readonly message: string,
    public readonly timeout?: number
  ) {
    Notice.instances.push(this);
  }
}

export class Component {
  load(): void {}

  unload(): void {}
}

export class Menu extends Component {
  static readonly instances: Menu[] = [];
  readonly items: MenuItem[] = [];
  lastMouseEvent: MouseEvent | null = null;
  lastPosition: { x: number; y: number; width?: number; overlap?: boolean; left?: boolean } | null = null;
  useNativeMenu: boolean | null = null;
  private hideHandlers: Array<() => unknown> = [];
  private domEl: FakeElement | null = null;
  private hidden = false;

  constructor() {
    super();
    Menu.instances.push(this);
  }

  addItem(callback: (item: MenuItem) => void): this {
    const item = new MenuItem();
    callback(item);
    this.items.push(item);
    return this;
  }

  setUseNativeMenu(useNativeMenu: boolean): this {
    this.useNativeMenu = useNativeMenu;
    return this;
  }

  showAtMouseEvent(evt: MouseEvent): this {
    this.lastMouseEvent = evt;
    return this;
  }

  showAtPosition(
    position: { x: number; y: number; width?: number; overlap?: boolean; left?: boolean },
    doc?: Document,
  ): this {
    this.lastPosition = position;
    this.hidden = false;
    this.renderDom(doc);
    return this;
  }

  hide(): this {
    if (this.hidden) {
      return this;
    }

    this.hidden = true;
    this.domEl?.remove();
    this.domEl = null;
    for (const callback of this.hideHandlers) {
      callback();
    }
    return this;
  }

  close(): void {
    this.hide();
  }

  onHide(callback: () => unknown): void {
    this.hideHandlers.push(callback);
  }

  private renderDom(doc?: Document): void {
    const targetDocument = (doc ?? globalThis.document) as
      | (Document & {
          body?: FakeElement;
          createElement?(tagName: string): FakeElement;
        })
      | undefined;

    if (!targetDocument?.body || !targetDocument.createElement) {
      return;
    }

    this.domEl?.remove();
    const menuEl = targetDocument.createElement("div");
    menuEl.addClass("menu");
    const horizontalOffset = this.lastPosition?.overlap ? 0 : this.lastPosition?.width ?? 0;
    const left = this.lastPosition?.left
      ? (this.lastPosition?.x ?? 0) - horizontalOffset
      : (this.lastPosition?.x ?? 0) + horizontalOffset;
    menuEl.setBoundingClientRect({
      left,
      top: this.lastPosition?.y ?? 0,
      width: this.lastPosition?.width ?? 160,
      height: this.items.length * 28,
    });

    this.items.forEach((item, index) => {
      const rowEl = targetDocument.createElement("div");
      rowEl.addClass("menu-item");
      rowEl.setAttribute("aria-label", item.title);
      rowEl.setAttribute("data-section", item.section);
      rowEl.setBoundingClientRect({
        left,
        top: (this.lastPosition?.y ?? 0) + index * 28,
        width: this.lastPosition?.width ?? 160,
        height: 28,
      });
      rowEl.addEventListener("click", () => {
        void item.trigger({
          currentTarget: rowEl,
          target: rowEl,
        });
      });
      menuEl.appendChild(rowEl);
    });

    targetDocument.body.appendChild(menuEl);
    this.domEl = menuEl;
  }
}

export class MenuItem {
  title = "";
  icon: string | null = null;
  disabled = false;
  checked: boolean | null = null;
  warning = false;
  isLabel = false;
  section = "";
  submenu: Menu | null = null;
  private clickHandler: EventHandler | null = null;

  setTitle(title: string | FakeElement): this {
    this.title = typeof title === "string" ? title : title.textContent;
    return this;
  }

  setIcon(icon: string | null): this {
    this.icon = icon;
    return this;
  }

  setChecked(checked: boolean | null): this {
    this.checked = checked;
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    return this;
  }

  setWarning(isWarning: boolean): this {
    this.warning = isWarning;
    return this;
  }

  setIsLabel(isLabel: boolean): this {
    this.isLabel = isLabel;
    return this;
  }

  onClick(callback: EventHandler): this {
    this.clickHandler = callback;
    return this;
  }

  setSection(section: string): this {
    this.section = section;
    return this;
  }

  setSubmenu(): Menu {
    this.submenu = new Menu();
    return this.submenu;
  }

  trigger(event?: unknown): unknown {
    return this.clickHandler?.(event);
  }
}

export class WorkspaceLeaf {
  view: unknown = null;
  lastViewState: Record<string, unknown> | null = null;

  constructor(private readonly app?: App) {}

  async setViewState(viewState: Record<string, unknown>): Promise<void> {
    this.lastViewState = viewState;
    const type = typeof viewState.type === "string" ? viewState.type : "";
    const creator = type ? this.app?.workspace.viewCreators?.[type] : undefined;
    if (creator) {
      this.view = creator(this);
    }
  }
}

export class ItemView extends Component {
  readonly contentEl = new FakeElement("div");

  constructor(public readonly leaf: WorkspaceLeaf) {
    super();
  }
}

export class Modal extends Component {
  readonly containerEl: FakeElement;
  readonly modalEl: FakeElement;
  readonly titleEl: FakeElement;
  readonly contentEl: FakeElement;

  constructor(public readonly app: App) {
    super();
    this.containerEl = new FakeElement("div");
    this.modalEl = new FakeElement("div");
    this.titleEl = new FakeElement("div");
    this.contentEl = new FakeElement("div");

    this.modalEl.parentElement = this.containerEl;
    this.containerEl.children.push(this.modalEl);

    this.titleEl.parentElement = this.modalEl;
    this.modalEl.children.push(this.titleEl);

    this.contentEl.parentElement = this.modalEl;
    this.modalEl.children.push(this.contentEl);
  }

  open(): this {
    void this.onOpen();
    return this;
  }

  close(): void {
    this.onClose();
  }

  onOpen(): Promise<void> | void {}

  onClose(): void {}
}

export class SuggestModal<T> extends Modal {
  placeholder = "";

  setPlaceholder(value: string): this {
    this.placeholder = value;
    return this;
  }

  getSuggestions(_query: string): T[] {
    return [];
  }

  renderSuggestion(_value: T, _el: FakeElement): void {}

  onChooseSuggestion(_value: T, _evt?: MouseEvent | KeyboardEvent): void {}
}

export class PluginSettingTab {
  readonly containerEl = new FakeElement("div");

  constructor(
    public readonly app: App,
    public readonly plugin: Plugin
  ) {}
}

export class Setting {
  constructor(private readonly containerEl: FakeElement) {
    const row = containerEl.createDiv({ cls: "setting-item" });
    row.createDiv({ cls: "setting-item-info" });
    row.createDiv({ cls: "setting-item-control" });
  }

  setName(_name: string): this {
    return this;
  }

  setDesc(_desc: string): this {
    return this;
  }

  addButton(callback: (button: ButtonComponent) => void): this {
    callback(new ButtonComponent(this.containerEl));
    return this;
  }

  addToggle(callback: (toggle: ToggleComponent) => void): this {
    callback(new ToggleComponent());
    return this;
  }

  addText(callback: (text: TextComponent) => void): this {
    callback(new TextComponent());
    return this;
  }

  addDropdown(callback: (dropdown: DropdownComponent) => void): this {
    callback(new DropdownComponent());
    return this;
  }
}

class ButtonComponent {
  constructor(private readonly containerEl: FakeElement) {}

  setButtonText(text: string): this {
    this.containerEl.createEl("button", { text });
    return this;
  }

  setWarning(): this {
    return this;
  }

  onClick(_callback: () => unknown): this {
    return this;
  }
}

class ToggleComponent {
  setValue(_value: boolean): this {
    return this;
  }

  onChange(_callback: (value: boolean) => unknown): this {
    return this;
  }
}

class TextComponent {
  readonly inputEl = new FakeElement("input");

  setPlaceholder(_placeholder: string): this {
    return this;
  }

  setValue(value: string): this {
    this.inputEl.value = value;
    return this;
  }

  onChange(_callback: (value: string) => unknown): this {
    return this;
  }
}

class DropdownComponent {
  addOption(_value: string, _label: string): this {
    return this;
  }

  setValue(_value: string): this {
    return this;
  }

  onChange(_callback: (value: string) => unknown): this {
    return this;
  }
}

export class Plugin extends Component {
  constructor(
    public readonly app: App,
    public readonly manifest: { id: string }
  ) {
    super();
    app.workspace.viewCreators ??= {};
  }

  addRibbonIcon(_icon: string, _title: string, _callback: (evt: MouseEvent) => unknown): FakeElement {
    return new FakeElement("button");
  }

  addCommand(_command: Record<string, unknown>): void {}

  addSettingTab(_tab: PluginSettingTab): void {}

  registerEvent(_eventRef: unknown): void {}

  registerView(type: string, creator: (leaf: WorkspaceLeaf) => unknown): void {
    this.app.workspace.viewCreators ??= {};
    this.app.workspace.viewCreators[type] = creator;
  }

  async loadData(): Promise<unknown> {
    return null;
  }

  async saveData(_data: unknown): Promise<void> {}
}

export const MarkdownRenderer = {
  render: vi.fn(async (_app: unknown, markdown: string, container: { innerHTML: string }) => {
    container.innerHTML = markdown;
  }),
};

export const requestUrl = vi.fn(async () => {
  throw new Error("requestUrl mock not configured");
});

export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

let testLanguage = "en";

export function getLanguage(): string {
  return testLanguage;
}

export function setObsidianTestLanguage(next: string): void {
  testLanguage = next;
}

export function resetObsidianTestState(): void {
  Menu.instances.splice(0, Menu.instances.length);
  Notice.instances.splice(0, Notice.instances.length);
  testLanguage = "en";
}
