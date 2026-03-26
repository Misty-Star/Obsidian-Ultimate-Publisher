function createFieldContainer(container: HTMLElement, label: string): HTMLElement {
  const field = container.createDiv({ cls: "ultimate-publisher-normal-field" });
  field.createEl("label", { text: label });
  return field;
}

export function renderTextInput(
  container: HTMLElement,
  options: {
    label: string;
    name: string;
    value: string;
    onInput: (value: string) => void;
  }
): HTMLElement {
  const field = createFieldContainer(container, options.label);
  const input = field.createEl("input", { type: "text" });
  input.name = options.name;
  input.value = options.value;
  input.addEventListener("input", () => {
    options.onInput(input.value);
  });
  return input;
}

export function renderTextArea(
  container: HTMLElement,
  options: {
    label: string;
    name: string;
    value: string;
    onInput: (value: string) => void;
  }
): HTMLElement {
  const field = createFieldContainer(container, options.label);
  const input = field.createEl("textarea");
  input.name = options.name;
  input.value = options.value;
  input.addEventListener("input", () => {
    options.onInput(input.value);
  });
  return input;
}

export function renderStringListInput(
  container: HTMLElement,
  options: {
    label: string;
    name: string;
    value: string[];
    onInput: (value: string[]) => void;
  }
): HTMLElement {
  return renderTextInput(container, {
    label: options.label,
    name: options.name,
    value: options.value.join(", "),
    onInput: (value) => {
      options.onInput(
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      );
    },
  });
}

export function renderHelperText(container: HTMLElement, text: string): void {
  container.createEl("p", {
    cls: "ultimate-publisher-normal-helper",
    text,
  });
}
