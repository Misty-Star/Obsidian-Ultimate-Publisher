export interface SelectOption {
  value: string;
  label: string;
}

export interface StringListChoice {
  id: string;
  value: string;
  label: string;
  description?: string;
}

export interface FieldActionOptions {
  label: string;
  busyLabel?: string;
  disabled?: boolean;
  busy?: boolean;
  errorMessage?: string;
  onClick: () => void;
}

function createFieldContainer(
  container: HTMLElement,
  label: string,
  description?: string,
  action?: FieldActionOptions
): HTMLElement {
  const field = container.createDiv({ cls: "ultimate-publisher-normal-field" });
  const header = field.createDiv({ cls: "ultimate-publisher-normal-field-header" });
  header.createEl("label", { text: label });

  if (action) {
    const button = header.createEl("button", {
      text: action.busy ? action.busyLabel ?? action.label : action.label,
    });
    button.type = "button";
    button.addClass("ultimate-publisher-normal-field-action");
    button.disabled = Boolean(action.disabled || action.busy);
    button.addEventListener("click", () => {
      if (action.disabled || action.busy) {
        return;
      }
      action.onClick();
    });
  }

  if (description) {
    field.createEl("p", {
      cls: "ultimate-publisher-normal-helper",
      text: description,
    });
  }

  if (action?.errorMessage) {
    renderHelperText(field, action.errorMessage, "warning");
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
    action?: FieldActionOptions;
    onInput: (value: string) => void;
  }
): HTMLElement {
  const field = createFieldContainer(container, options.label, options.description, options.action);
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
    action?: FieldActionOptions;
    onInput: (value: string) => void;
  }
): HTMLElement {
  const field = createFieldContainer(container, options.label, options.description, options.action);
  const input = field.createEl("textarea");
  input.name = options.name;
  input.value = options.value;
  input.addEventListener("input", () => {
    options.onInput(input.value);
  });
  return input;
}

function parseStringList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStringList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }

  return result;
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
      options.onInput(parseStringList(value));
    },
  });
}

export function renderSelectableStringListInput(
  container: HTMLElement,
  options: {
    label: string;
    name: string;
    value: string[];
    choices: StringListChoice[];
    description?: string;
    onInput: (value: string[]) => void;
  }
): HTMLElement {
  const field = createFieldContainer(container, options.label, options.description);
  const input = field.createEl("input", { type: "text" });
  input.name = options.name;
  input.value = options.value.join(", ");

  const choiceValues = new Set(options.choices.map((choice) => choice.value));
  const choiceInputs = options.choices.map((choice) => {
    const row = field.createDiv({ cls: "ultimate-publisher-normal-choice-row" });
    const label = row.createEl("label", { cls: "ultimate-publisher-normal-choice-label" });
    const checkbox = label.createEl("input", { type: "checkbox" });
    checkbox.name = `${options.name}-option-${choice.id}`;
    checkbox.value = choice.value;
    checkbox.checked = options.value.includes(choice.value);
    label.createSpan({ text: choice.label });

    if (choice.description) {
      row.createEl("p", {
        cls: "ultimate-publisher-normal-helper",
        text: choice.description,
      });
    }

    return { choice, checkbox };
  });

  const syncValue = (values: string[]): void => {
    const nextValues = uniqueStringList(values);
    input.value = nextValues.join(", ");
    for (const { choice, checkbox } of choiceInputs) {
      checkbox.checked = nextValues.includes(choice.value);
    }
    options.onInput(nextValues);
  };

  input.addEventListener("input", () => {
    syncValue(parseStringList(input.value));
  });

  for (const { checkbox } of choiceInputs) {
    checkbox.addEventListener("change", () => {
      const manualValues = parseStringList(input.value).filter((value) => !choiceValues.has(value));
      const selectedValues = choiceInputs
        .filter((item) => item.checkbox.checked)
        .map((item) => item.choice.value);
      syncValue([...selectedValues, ...manualValues]);
    });
  }

  return input;
}

export function renderDropdownSelectableStringListInput(
  container: HTMLElement,
  options: {
    label: string;
    name: string;
    value: string[];
    choices: StringListChoice[];
    description?: string;
    onInput: (value: string[]) => void;
  }
): HTMLElement {
  const field = createFieldContainer(container, options.label, options.description);
  const input = field.createEl("input", { type: "text" });
  input.name = options.name;
  input.value = options.value.join(", ");

  const dropdown = field.createDiv({ cls: "ultimate-publisher-normal-dropdown" });
  dropdown.style.display = "none";

  const choiceValues = new Set(options.choices.map((choice) => choice.value));
  const choiceInputs = options.choices.map((choice) => {
    const row = dropdown.createDiv({ cls: "ultimate-publisher-normal-choice-row" });
    const label = row.createEl("label", { cls: "ultimate-publisher-normal-choice-label" });
    const checkbox = label.createEl("input", { type: "checkbox" });
    checkbox.name = `${options.name}-option-${choice.id}`;
    checkbox.value = choice.value;
    checkbox.checked = options.value.includes(choice.value);

    const textContainer = label.createSpan({ cls: "ultimate-publisher-normal-choice-text" });
    textContainer.createSpan({ text: choice.label });
    if (choice.description && choice.description !== choice.label) {
      textContainer.createSpan({ text: choice.description, cls: "ultimate-publisher-normal-alias" });
    }

    return { choice, checkbox };
  });

  const syncValue = (values: string[]): void => {
    const nextValues = uniqueStringList(values);
    input.value = nextValues.join(", ");
    for (const { choice, checkbox } of choiceInputs) {
      checkbox.checked = nextValues.includes(choice.value);
    }
    options.onInput(nextValues);
  };

  const openDropdown = (): void => {
    dropdown.style.display = "block";
  };

  const closeDropdown = (): void => {
    dropdown.style.display = "none";
  };

  input.addEventListener("click", () => {
    openDropdown();
  });

  input.addEventListener("keydown", (event) => {
    const keyboardEvent = event as { key?: string; preventDefault?: () => void } | undefined;
    if (keyboardEvent?.key !== "Enter") {
      return;
    }
    keyboardEvent.preventDefault?.();
    syncValue(parseStringList(input.value));
  });

  for (const { checkbox } of choiceInputs) {
    checkbox.addEventListener("change", () => {
      openDropdown();
      const manualValues = parseStringList(input.value).filter((value) => !choiceValues.has(value));
      const selectedValues = choiceInputs
        .filter((item) => item.checkbox.checked)
        .map((item) => item.choice.value);
      syncValue([...selectedValues, ...manualValues]);
    });
  }

  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    setTimeout(() => {
      document.addEventListener("click", (event) => {
        if (!field.contains(event.target as Node)) {
          closeDropdown();
        }
      });
    }, 0);
  }

  return input;
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
