import { vi } from "vitest";

export interface CachedMetadata {
  frontmatter?: Record<string, unknown>;
}

type EventHandler = (event?: unknown) => unknown;

export class FakeElement {
  readonly children: FakeElement[] = [];
  readonly listeners = new Map<string, EventHandler[]>();
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

  dispatchEvent(type: string, event?: unknown): void {
    for (const handler of this.listeners.get(type) ?? []) {
      handler(event);
    }
  }

  click(): void {
    this.dispatchEvent("click", { currentTarget: this, target: this });
  }
}

export interface App {
  vault: {
    cachedRead(path: unknown): Promise<string>;
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
  lastPosition: { x: number; y: number; width?: number } | null = null;
  useNativeMenu: boolean | null = null;

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

  showAtPosition(position: { x: number; y: number; width?: number }): this {
    this.lastPosition = position;
    return this;
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
