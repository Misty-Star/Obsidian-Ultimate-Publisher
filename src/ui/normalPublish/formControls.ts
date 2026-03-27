export interface SelectOption {
  value: string;
  label: string;
}

function createFieldContainer(container: HTMLElement, label: string, description?: string): HTMLElement {
  const field = container.createDiv({ cls: "ultimate-publisher-normal-field" });
  field.createEl("label", { text: label });
  if (description) {
    field.createEl("p", {
      cls: "ultimate-publisher-normal-helper",
      text: description,
    });
  }
  return field;
}

export function renderTextInput(
  container: HTMLElement,
  options: {
    label: string;
    name: string;
    value: string;
    description?: string;
    onInput: (value: string) => void;
  }
): HTMLElement {
  const field = createFieldContainer(container, options.label, options.description);
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
    description?: string;
    onInput: (value: string) => void;
  }
): HTMLElement {
  const field = createFieldContainer(container, options.label, options.description);
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
    description?: string;
    onInput: (value: string[]) => void;
  }
): HTMLElement {
  return renderTextInput(container, {
    label: options.label,
    name: options.name,
    value: options.value.join(", "),
    description: options.description,
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

export function renderSelectInput(
  container: HTMLElement,
  options: {
    label: string;
    name: string;
    value: string;
    choices: SelectOption[];
    description?: string;
    onChange: (value: string) => void;
  }
): HTMLElement {
  const field = createFieldContainer(container, options.label, options.description);
  const select = field.createEl("select");
  select.name = options.name;

  for (const choice of options.choices) {
    const option = select.createEl("option");
    option.value = choice.value;
    option.textContent = choice.label;
  }

  select.value = options.value;
  select.addEventListener("change", () => {
    options.onChange(select.value);
  });
  return select;
}

export function renderHelperText(container: HTMLElement, text: string, tone: "muted" | "info" | "warning" = "muted"): void {
  const helper = container.createEl("p", {
    cls: "ultimate-publisher-normal-helper",
    text,
  });
  if (tone !== "muted") {
    helper.addClass(`is-${tone}`);
  }
}
