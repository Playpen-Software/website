// modules/playpen.ts
var dependencyListeners = new WeakMap;
function getCheckboxDependency(dependentCheckbox) {
  const dependency = dependentCheckbox.dataset["depends"] ?? "";
  const separatorIndex = dependency.indexOf(":");
  if (separatorIndex < 1) {
    console.error(`Invalid checkbox data-depends value: "${dependency}". Expected "id:checked" or "id:unchecked".`);
    return null;
  }
  const dependencyId = dependency.slice(0, separatorIndex).trim();
  const expectedValue = dependency.slice(separatorIndex + 1).trim();
  if (!dependencyId || expectedValue !== "checked" && expectedValue !== "unchecked") {
    console.error(`Invalid checkbox data-depends value: "${dependency}". Expected "id:checked" or "id:unchecked".`);
    return null;
  }
  const source = document.getElementById(dependencyId);
  if (!(source instanceof HTMLInputElement) || source.type !== "checkbox") {
    console.error(`Checkbox dependency "${dependencyId}" does not reference a checkbox element.`);
    return null;
  }
  return { source, expectedValue };
}
function initInputButtonLink() {
  const buttons = document.querySelectorAll("button[data-input-link]");
  buttons.forEach(function(button) {
    const linkedElID = button.getAttribute("data-input-link") || "";
    const linkedEl = document.getElementById(linkedElID);
    button.addEventListener("click", function() {
      linkedEl?.click();
    });
  });
}
function init() {
  const dependentCheckboxes = document.querySelectorAll('input[type="checkbox"][data-depends]');
  dependentCheckboxes.forEach((dependentCheckbox) => {
    const dependency = getCheckboxDependency(dependentCheckbox);
    const existingListener = dependencyListeners.get(dependentCheckbox);
    if (!dependency) {
      if (existingListener) {
        existingListener.source.removeEventListener("change", existingListener.handler);
        dependencyListeners.delete(dependentCheckbox);
      }
      return;
    }
    if (existingListener?.source === dependency.source && existingListener.expectedValue === dependency.expectedValue) {
      const shouldBeChecked = dependency.expectedValue === "checked";
      dependentCheckbox.disabled = dependency.source.checked !== shouldBeChecked;
      return;
    }
    if (existingListener) {
      existingListener.source.removeEventListener("change", existingListener.handler);
    }
    const updateState = () => {
      const shouldBeChecked = dependency.expectedValue === "checked";
      dependentCheckbox.disabled = dependency.source.checked !== shouldBeChecked;
    };
    dependency.source.addEventListener("change", updateState);
    dependencyListeners.set(dependentCheckbox, {
      ...dependency,
      handler: updateState
    });
    updateState();
  });
  initInputButtonLink();
  PopupPlacer.init();
}

class ColorPicker {
  container;
  previewBox;
  svCanvas;
  hueSlider;
  inputElement;
  hexLabel;
  svCtx;
  currentHex;
  currentH;
  currentS;
  currentV;
  constructor(initialValue) {
    this.currentHex = typeof initialValue === "string" && /^#[\da-f]{6}$/i.test(initialValue) ? initialValue : "#000000";
    const hsv = this.hexToHsv(this.currentHex);
    this.currentH = hsv.h;
    this.currentS = hsv.s;
    this.currentV = hsv.v;
    this.container = document.createElement("div");
    this.container.className = "playpen-color-picker";
    this.previewBox = document.createElement("div");
    this.previewBox.className = "color-preview";
    this.previewBox.style.backgroundColor = this.currentHex;
    this.svCanvas = document.createElement("canvas");
    this.svCanvas.className = "sv-canvas";
    this.svCtx = this.svCanvas.getContext("2d", { willReadFrequently: true });
    this.hueSlider = document.createElement("input");
    this.hueSlider.type = "range";
    this.hueSlider.min = "0";
    this.hueSlider.max = "360";
    this.hueSlider.value = String(this.currentH);
    this.hueSlider.className = "hue-slider";
    this.inputElement = document.createElement("input");
    this.inputElement.type = "text";
    this.inputElement.className = "playpen-input color-hex";
    this.inputElement.placeholder = "#RRGGBB";
    this.inputElement.setAttribute("aria-label", "Hex color value");
    this.inputElement.required = true;
    this.inputElement.pattern = "#[\\da-fA-F]{6}";
    this.inputElement.value = this.currentHex;
    this.hexLabel = document.createElement("label");
    this.hexLabel.className = "playpen-label color-hex-label";
    this.hexLabel.textContent = "Hex value";
    this.hexLabel.append(this.inputElement);
    this.container.append(this.previewBox, this.svCanvas, this.hueSlider);
    this.initEvents();
  }
  mount(parent) {
    parent.append(this.container, this.hexLabel);
    this.renderCanvas();
  }
  renderCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.svCanvas.clientWidth || 280;
    const displayHeight = 140;
    this.svCanvas.width = displayWidth * dpr;
    this.svCanvas.height = displayHeight * dpr;
    this.svCtx?.scale(dpr, dpr);
    this.drawSVBox(displayWidth, displayHeight);
  }
  drawSVBox(width, height) {
    if (!this.svCtx)
      return;
    this.svCtx.clearRect(0, 0, width, height);
    this.svCtx.fillStyle = `hsl(${this.currentH}, 100%, 50%)`;
    this.svCtx.fillRect(0, 0, width, height);
    const gradWhite = this.svCtx.createLinearGradient(0, 0, width, 0);
    gradWhite.addColorStop(0, "rgba(255,255,255,1)");
    gradWhite.addColorStop(1, "rgba(255,255,255,0)");
    this.svCtx.fillStyle = gradWhite;
    this.svCtx.fillRect(0, 0, width, height);
    const gradBlack = this.svCtx.createLinearGradient(0, 0, 0, height);
    gradBlack.addColorStop(0, "rgba(0,0,0,0)");
    gradBlack.addColorStop(1, "rgba(0,0,0,1)");
    this.svCtx.fillStyle = gradBlack;
    this.svCtx.fillRect(0, 0, width, height);
    const cx = this.currentS / 100 * width;
    const cy = (1 - this.currentV / 100) * height;
    this.svCtx.strokeStyle = this.currentV > 50 && this.currentS < 50 ? "#000000" : "#ffffff";
    this.svCtx.lineWidth = 2;
    this.svCtx.beginPath();
    this.svCtx.arc(cx, cy, 5, 0, 2 * Math.PI);
    this.svCtx.stroke();
  }
  initEvents() {
    const updateFromHSV = (h, s, v, updateInput = true) => {
      this.currentHex = this.hsvToHex(h, s, v);
      if (updateInput)
        this.inputElement.value = this.currentHex;
      this.previewBox.style.backgroundColor = this.currentHex;
      this.drawSVBox(this.svCanvas.clientWidth || 280, 140);
    };
    const handleSVInteraction = (e) => {
      const rect = this.svCanvas.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY : e.clientY;
      let x = Math.max(0, Math.min(clientX ? clientX - rect.left : 0, rect.width));
      let y = Math.max(0, Math.min(clientY ? clientY - rect.top : 0, rect.height));
      this.currentS = x / rect.width * 100;
      this.currentV = (1 - y / rect.height) * 100;
      updateFromHSV(this.currentH, this.currentS, this.currentV);
    };
    this.svCanvas.addEventListener("pointerdown", (e) => {
      this.svCanvas.setPointerCapture(e.pointerId);
      handleSVInteraction(e);
    });
    this.svCanvas.addEventListener("pointermove", (e) => {
      if (e.buttons > 0 || e.pressure > 0)
        handleSVInteraction(e);
    });
    this.hueSlider.addEventListener("input", () => {
      this.currentH = parseFloat(this.hueSlider.value);
      updateFromHSV(this.currentH, this.currentS, this.currentV);
    });
    this.inputElement.addEventListener("input", () => {
      const isValidHex = /^#[\da-f]{6}$/i.test(this.inputElement.value);
      this.inputElement.setCustomValidity(isValidHex ? "" : "Enter a color in #RRGGBB format.");
      if (isValidHex) {
        this.currentHex = this.inputElement.value;
        const hsv = this.hexToHsv(this.currentHex);
        this.currentH = hsv.h;
        this.currentS = hsv.s;
        this.currentV = hsv.v;
        this.hueSlider.value = String(this.currentH);
        this.previewBox.style.backgroundColor = this.currentHex;
        this.drawSVBox(this.svCanvas.clientWidth || 280, 140);
      }
    });
  }
  hexToHsv(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max, d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
  }
  hsvToHex(h, s, v) {
    s /= 100;
    v /= 100;
    let c = v * s, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = v - c;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (60 <= h && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (120 <= h && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (180 <= h && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (240 <= h && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (300 <= h && h < 360) {
      r = c;
      g = 0;
      b = x;
    }
    let rr = Math.round((r + m) * 255).toString(16).padStart(2, "0");
    let gg = Math.round((g + m) * 255).toString(16).padStart(2, "0");
    let bb = Math.round((b + m) * 255).toString(16).padStart(2, "0");
    return `#${rr}${gg}${bb}`.toUpperCase();
  }
}

class PopupPlacer {
  static popupMargin = 5;
  static cursorX = null;
  static cursorY = null;
  static init() {
    document.addEventListener("mousemove", (event) => {
      this.cursorX = event.clientX;
      this.cursorY = event.clientY;
    });
  }
  static place(container, popup, anchor) {
    popup.style.position = "fixed";
    popup.style.left = "0px";
    popup.style.top = "0px";
    const style = getComputedStyle(popup);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    const minX = this.popupMargin;
    const minY = this.popupMargin;
    const maxX = window.innerWidth - width - this.popupMargin;
    const maxY = window.innerHeight - height - this.popupMargin;
    if (![width, height, maxX, maxY].every(Number.isFinite) || maxX < minX || maxY < minY) {
      this.fallback(container, popup);
      return;
    }
    const triggerRect = anchor?.getBoundingClientRect();
    const triggerX = triggerRect ? triggerRect.left + triggerRect.width / 2 : this.cursorX;
    const triggerY = triggerRect?.bottom ?? this.cursorY;
    if (triggerX === null || triggerY === null) {
      this.fallback(container, popup);
      return;
    }
    const x = triggerX - width / 2;
    const y = triggerY + this.popupMargin;
    const clampX = (val) => Math.max(minX, Math.min(val, maxX));
    const clampY = (val) => Math.max(minY, Math.min(val, maxY));
    const aboveTrigger = triggerRect ? { x: triggerX - width / 2, y: triggerRect.top - height - this.popupMargin } : null;
    const candidates = [
      { x, y },
      ...aboveTrigger ? [aboveTrigger] : [],
      ...triggerRect ? [
        { x: triggerRect.right + this.popupMargin, y: triggerRect.top + (triggerRect.height - height) / 2 },
        { x: triggerRect.left - width - this.popupMargin, y: triggerRect.top + (triggerRect.height - height) / 2 }
      ] : []
    ];
    const fallbackPos = triggerRect && triggerRect.top > window.innerHeight / 2 && aboveTrigger ? aboveTrigger : { x, y };
    const placement = candidates.find((pos) => pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) ?? {
      x: clampX(fallbackPos.x),
      y: clampY(fallbackPos.y)
    };
    popup.style.left = `${placement.x}px`;
    popup.style.top = `${placement.y}px`;
  }
  static fallback(container, popup) {
    container.classList.add("center", "popup-container-shaded");
    popup.style.position = "";
    popup.style.left = "";
    popup.style.top = "";
  }
}

// modules/notifications.ts
var dismissActivePopup = null;
function showPopup(title, message, type = "options", options = [
  { content: "No", value: false, highlighted: false },
  { content: "Yes", value: true, highlighted: true }
], inputProps = {}, center = false) {
  const activeElement = document.activeElement;
  const anchor = activeElement instanceof HTMLElement ? activeElement.closest("button") : null;
  dismissActivePopup?.();
  return new Promise((resolve) => {
    const popupContainer = document.createElement("div");
    popupContainer.className = "popup-container";
    const popup = document.createElement("div");
    popup.className = "popup";
    const titleBar = document.createElement("div");
    titleBar.className = "popup-title-bar";
    const titleOutput = document.createElement("span");
    titleOutput.className = "popup-title";
    titleOutput.textContent = title;
    titleBar.appendChild(titleOutput);
    const messageContainer = document.createElement("div");
    messageContainer.className = "message-container";
    const span = document.createElement("span");
    span.innerHTML = message;
    messageContainer.appendChild(span);
    let inputElement = null;
    let colorPickerInstance = null;
    if (type !== "options") {
      if (type === "select") {
        const selectElement = document.createElement("select");
        inputProps.selectOptions?.forEach((option) => {
          selectElement.add(new Option(option, option));
        });
        inputElement = selectElement;
        inputElement.className = "playpen-input";
      } else if (type === "color") {
        colorPickerInstance = new ColorPicker(inputProps.value);
        colorPickerInstance.mount(messageContainer);
        inputElement = colorPickerInstance.inputElement;
      } else {
        inputElement = document.createElement("input");
        inputElement.type = type;
        inputElement.className = "playpen-input";
      }
      if (type !== "color") {
        Object.entries(inputProps).forEach(([key, val]) => {
          if (key !== "selectOptions" && val !== undefined && val !== null) {
            if (typeof val === "boolean")
              inputElement.toggleAttribute(key, val);
            else
              inputElement.setAttribute(key, String(val));
          }
        });
        if (inputProps.value !== undefined && inputElement)
          inputElement.value = String(inputProps.value);
        messageContainer.appendChild(inputElement);
      }
    }
    const actionContainer = document.createElement("div");
    actionContainer.className = "action-container";
    let highlightedButton = null;
    const transitionAnimations = preferences["transitionAnimations"];
    let isClosing = false;
    let outsidePointerDown = null;
    let dismissThisPopup = null;
    const clearActivePopup = () => {
      if (dismissActivePopup === dismissThisPopup) {
        dismissActivePopup = null;
      }
    };
    const removeOutsideListener = () => {
      if (outsidePointerDown) {
        document.removeEventListener("pointerdown", outsidePointerDown);
        outsidePointerDown = null;
      }
    };
    const closePopup = (selectedValue, immediately = false) => {
      if (immediately || isClosing) {
        if (!isClosing && immediately)
          isClosing = true;
        removeOutsideListener();
        popupContainer.remove();
        clearActivePopup();
        resolve(selectedValue);
        return;
      }
      isClosing = true;
      removeOutsideListener();
      if (!transitionAnimations) {
        popupContainer.remove();
        clearActivePopup();
        resolve(selectedValue);
        return;
      }
      const isShaded = popupContainer.classList.contains("popup-container-shaded");
      const finishClose = () => {
        popupContainer.remove();
        clearActivePopup();
        resolve(selectedValue);
      };
      let pendingAnimations = isShaded ? 2 : 1;
      const animationEnded = () => {
        pendingAnimations -= 1;
        if (pendingAnimations === 0)
          finishClose();
      };
      popup.addEventListener("animationend", animationEnded, { once: true });
      popup.style.animation = "playpenFadeOut 0.3s var(--transition-easing-style, ease-out) forwards";
      if (isShaded) {
        const onContainerAnimationEnd = (event) => {
          if (event.target !== popupContainer)
            return;
          popupContainer.removeEventListener("animationend", onContainerAnimationEnd);
          animationEnded();
        };
        popupContainer.addEventListener("animationend", onContainerAnimationEnd);
        popupContainer.style.animation = "popupContainerFadeOut 0.3s var(--transition-easing-style, ease-out) forwards";
      }
    };
    dismissThisPopup = () => closePopup(undefined, true);
    dismissActivePopup = dismissThisPopup;
    const effectiveOptions = type !== "options" && options.length === 2 && options[0]?.content === "No" && options[1]?.content === "Yes" ? [
      { content: "Cancel", value: undefined, highlighted: false },
      { content: "Set", value: "inputValue", highlighted: true }
    ] : options;
    const getSelectedInputValue = () => inputElement instanceof HTMLInputElement && inputElement.type === "file" ? inputElement.files : inputElement?.value;
    const handleOptionSelection = (optValue) => {
      if (type === "color" && optValue === "inputValue" && inputElement instanceof HTMLInputElement && !inputElement.reportValidity()) {
        return;
      }
      const val = optValue === "inputValue" ? getSelectedInputValue() : optValue;
      closePopup(val);
    };
    effectiveOptions.forEach((opt) => {
      const btn = document.createElement("button");
      btn.textContent = opt.content;
      btn.className = opt.highlighted ? "playpen-primary-button primary" : "playpen-primary-button";
      if (opt.highlighted)
        highlightedButton = btn;
      btn.addEventListener("click", () => handleOptionSelection(opt.value));
      actionContainer.appendChild(btn);
    });
    if (inputElement instanceof HTMLInputElement) {
      inputElement.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !["select", "range", "color"].includes(type)) {
          e.preventDefault();
          const targetOpt = effectiveOptions.find((o) => o.highlighted && o.value === "inputValue") || effectiveOptions.find((o) => o.value === "inputValue") || effectiveOptions[effectiveOptions.length - 1];
          handleOptionSelection(targetOpt?.value);
        }
      });
    }
    popup.appendChild(titleBar);
    popup.appendChild(messageContainer);
    popup.appendChild(actionContainer);
    popupContainer.appendChild(popup);
    document.body.appendChild(popupContainer);
    if (center) {
      popupContainer.classList.add("center", "popup-container-shaded");
    } else {
      PopupPlacer.place(popupContainer, popup, anchor);
    }
    outsidePointerDown = (event) => {
      const target = event.target;
      if (target instanceof Node && !popup.contains(target) && !anchor?.contains(target)) {
        closePopup(undefined);
      }
    };
    document.addEventListener("pointerdown", outsidePointerDown);
    if (transitionAnimations) {
      popup.style.animation = "playpenFadeIn 0.3s var(--transition-easing-style, ease-out) forwards";
      if (popupContainer.classList.contains("popup-container-shaded")) {
        popupContainer.style.animation = "popupContainerFadeIn 0.3s var(--transition-easing-style, ease-out) forwards";
      }
    }
    requestAnimationFrame(() => {
      if (isClosing || !popupContainer.isConnected)
        return;
      if (highlightedButton) {
        highlightedButton.focus();
      } else {
        inputElement?.focus();
      }
    });
  });
}

// modules/settings.ts
var defaultPreferences = {
  spaceFillersEnabled: true,
  useSpaceFillerBlur: true,
  transitionAnimations: true,
  spaceFillerAnimations: true
};
var currentPreferences = { ...defaultPreferences };
var preferences = Object.freeze({ ...currentPreferences });
var settingsInputsInitialized = false;
var tabInitialized = false;
function getEBD(id) {
  const element = document.getElementById(id);
  if (!element)
    throw new Error(`Settings element "${id}" was not found.`);
  return element;
}
async function init2() {
  try {
    const savedJson = localStorage.getItem("preferences");
    if (savedJson) {
      const saved = JSON.parse(savedJson);
      if (saved && Object.keys(saved).length) {
        currentPreferences = { ...currentPreferences, ...saved };
        preferences = Object.freeze({ ...currentPreferences });
      }
    }
  } catch (e) {
    console.error("Failed to load preferences from localStorage:", e);
  }
  initSettingsInputs();
  init();
  initTab();
}
function initSettingsInputs() {
  if (settingsInputsInitialized)
    return;
  document.querySelectorAll("input[data-preferences-key]").forEach((input) => {
    const key = input.dataset["preferencesKey"];
    syncPreferenceInput(input, key);
    input.addEventListener("change", () => {
      let value = input.type === "checkbox" ? input.checked : input.type === "number" ? input.valueAsNumber : input.value;
      if (typeof value === "number" && Number.isNaN(value))
        value = currentPreferences[key];
      setPreferences({ [key]: value }).catch((error) => {
        console.error(`Failed to save preference ${key}:`, error);
      });
    });
  });
  settingsInputsInitialized = true;
}
function syncPreferenceInput(input, key) {
  const value = currentPreferences[key];
  if (input.type === "checkbox")
    input.checked = Boolean(value);
  else if (input.type === "number")
    input.valueAsNumber = Number(value);
  else
    input.value = String(value);
}
async function setPreferences(updates) {
  for (const [key, value] of Object.entries(updates)) {
    if (!(key in currentPreferences))
      throw new Error(`Unknown preference: ${key}`);
    if (value !== undefined && typeof value !== typeof currentPreferences[key]) {
      throw new Error(`Preference "${key}" must be a ${typeof currentPreferences[key]}.`);
    }
  }
  currentPreferences = { ...currentPreferences, ...updates };
  preferences = Object.freeze({ ...currentPreferences });
  try {
    localStorage.setItem("preferences", JSON.stringify(currentPreferences));
  } catch (error) {
    throw new Error("Failed to save preferences to localStorage.");
  }
  Object.keys(updates).forEach(notifyPreferencesUpdate);
}
function notifyPreferencesUpdate(preference) {
  window.dispatchEvent(new CustomEvent("preferencesUpdate", { detail: { preference } }));
}
async function resetPreferences() {
  const snapshot = { ...defaultPreferences, themeVariables: {} };
  try {
    localStorage.setItem("preferences", JSON.stringify(snapshot));
    currentPreferences = snapshot;
    preferences = Object.freeze({ ...currentPreferences });
    Object.keys(defaultPreferences).forEach(notifyPreferencesUpdate);
    document.querySelectorAll("input[data-preferences-key]").forEach((input) => {
      syncPreferenceInput(input, input.dataset["preferencesKey"]);
    });
  } catch (error) {
    throw new Error("Failed to reset preferences.");
  }
  init();
}
function initTab() {
  if (tabInitialized)
    return;
  getEBD("settings-reset").addEventListener("click", async () => {
    if (await showPopup("Reset Website Preferences", "Are you sure you want to reset your preferences for this website?", "options", [
      { content: "Reset", value: true },
      { content: "Cancel", value: false, highlighted: true }
    ]))
      resetPreferences();
  });
  tabInitialized = true;
}

// modules/tabs.ts
var navigationHistory = [];
var navigationQueue = Promise.resolve();
document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element))
    return;
  const button = target.closest("button[data-tab-navigation]");
  if (!button)
    return;
  const targetId = (button.dataset["tabNavigation"] ?? "").split(",").map((id) => id.trim()).find((id) => id === "previous" || getEBD2(id) !== null);
  if (!targetId)
    return;
  event.preventDefault();
  goto(targetId, {
    logPrevious: button.dataset["tabLogPrevious"] !== "false"
  });
});
window.addEventListener("tabChange", (event) => {
  const activeTabId = event.detail.tabId;
  const highlightButtons = document.querySelectorAll('button[data-active-tab-highlight="true"]');
  highlightButtons.forEach((button) => {
    const navAttr = button.dataset["tabNavigation"] ?? "";
    const navIds = navAttr.split(",").map((id) => id.trim());
    if (navIds.includes(activeTabId)) {
      button.classList.add("primary");
    } else {
      button.classList.remove("primary");
    }
  });
});
function getEBD2(id) {
  return document.getElementById(id);
}
function getTree(id) {
  const parts = id.split("_");
  const tree = [];
  for (let i = 0;i < parts.length; i++) {
    tree.push(parts.slice(0, i + 1).join("_"));
  }
  return tree;
}
function isSubTab(id) {
  return getTree(id).length > 1;
}
function focusFirstFocusable(element) {
  const focusableElements = element.querySelectorAll('a[href], button, input, select, textarea, summary, [contenteditable="true"], [tabindex]');
  const firstFocusable = Array.from(focusableElements).find((candidate) => candidate.tabIndex >= 0 && !candidate.hasAttribute("disabled") && candidate.getClientRects().length > 0 && getComputedStyle(candidate).visibility !== "hidden");
  firstFocusable?.focus();
}
function waitForAnimation(element, instant, fallbackMs = 350) {
  if (instant)
    return Promise.resolve();
  return new Promise((resolve) => {
    let timer;
    const onEnd = (e) => {
      if (e.target === element) {
        cleanup();
        resolve();
      }
    };
    const cleanup = () => {
      element.removeEventListener("animationend", onEnd);
      clearTimeout(timer);
    };
    element.addEventListener("animationend", onEnd);
    timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, fallbackMs);
  });
}
function goto(id, options = {}) {
  const navigation = navigationQueue.then(() => gotoNow(id, options));
  navigationQueue = navigation.catch(() => {
    return;
  });
  return navigation;
}
async function gotoNow(id, options = {}) {
  const instant = options.instant !== undefined ? options.instant : !preferences["transitionAnimations"];
  let logPrevious = options.logPrevious !== undefined ? options.logPrevious : true;
  if (id === "previous") {
    const lastTab = navigationHistory.pop();
    if (!lastTab) {
      console.warn("No previous tab found in history navigation stack.");
      return;
    }
    id = lastTab.id;
    logPrevious = false;
  }
  const targetTree = getTree(id);
  let tabsHidden = 0;
  let lastHiddenTab;
  const existingTabs = document.querySelectorAll(".tab");
  const hidePromises = [];
  existingTabs.forEach((existingTab) => {
    const existingTabElement = getEBD2(existingTab.id);
    if (!existingTabElement)
      return;
    const existingTree = getTree(existingTab.id);
    if (targetTree.includes(existingTab.id))
      return;
    const existingRoot = existingTree[0];
    const targetRoot = targetTree[0];
    const existingParent = existingTree.slice(0, -1).join("_");
    const targetParent = targetTree.slice(0, -1).join("_");
    const isDifferentRoot = existingRoot !== targetRoot;
    const isSibling = existingTree.length === targetTree.length && existingParent === targetParent;
    if (!isDifferentRoot && !isSibling)
      return;
    const activeDisplay = existingTabElement.style.display || getComputedStyle(existingTabElement).display;
    if (activeDisplay === "none")
      return;
    hidePromises.push(hide(existingTab.id, { instant }));
    tabsHidden++;
    lastHiddenTab = { id: existingTab.id };
  });
  if (logPrevious && tabsHidden > 0 && lastHiddenTab) {
    navigationHistory.push(lastHiddenTab);
  }
  window.dispatchEvent(new CustomEvent("tabChange", {
    detail: { tabId: id }
  }));
  await Promise.all(hidePromises);
  await show(id, { instant });
}
async function hide(id, options = {}) {
  const thisElement = getEBD2(id);
  if (!thisElement)
    return;
  const instant = options.instant !== undefined ? options.instant : !preferences["transitionAnimations"];
  thisElement.style.animationDuration = instant ? "0s" : "";
  thisElement.classList.remove("is-fading-in", "is-fading-out");
  thisElement.offsetWidth;
  thisElement.classList.add("is-fading-out");
  await waitForAnimation(thisElement, instant);
  thisElement.style.display = "none";
  thisElement.classList.remove("is-fading-out");
}
async function show(id, options = {}) {
  const thisElement = getEBD2(id);
  if (!thisElement)
    return;
  const instant = options.instant !== undefined ? options.instant : !preferences["transitionAnimations"];
  const thisDisplay = thisElement.dataset["tabDisplay"] || "block";
  const parentTree = getTree(id);
  parentTree.pop();
  for (const parentId of parentTree) {
    const parentElement = getEBD2(parentId);
    if (!parentElement || !parentElement.classList.contains("tab"))
      continue;
    const parentDisplay = parentElement.style.display || getComputedStyle(parentElement).display;
    if (parentDisplay === "none")
      await show(parentId, { instant });
  }
  thisElement.style.display = thisDisplay;
  thisElement.style.animationDuration = instant ? "0s" : "";
  thisElement.classList.remove("is-fading-in", "is-fading-out");
  thisElement.offsetWidth;
  thisElement.classList.add("is-fading-in");
  await waitForAnimation(thisElement, instant);
  thisElement.classList.remove("is-fading-in");
  if (isSubTab(id))
    focusFirstFocusable(thisElement);
}

// modules/spaceFillers.ts
function getEBD3(id) {
  return document.getElementById(id);
}
function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
function waitForAnimation2(element, animationsEnabled, fallbackMs = 350) {
  if (!animationsEnabled)
    return Promise.resolve();
  return new Promise((resolve) => {
    let timer;
    const onEnd = (e) => {
      if (e.target === element) {
        cleanup();
        resolve();
      }
    };
    const cleanup = () => {
      element.removeEventListener("animationend", onEnd);
      clearTimeout(timer);
    };
    element.addEventListener("animationend", onEnd);
    timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, fallbackMs);
  });
}
async function init3() {
  fillSpaceContainer();
}
var shapeElementType = "div";
var baseShapeClass = "space-filler-shape";
var delay = 25;
var currentCallId = 0;
var lastCombinationIndex = null;
var floatAnimations = ["float", "float-slow", "float-fast", "float-subtle"];
async function fillSpaceContainer() {
  const callId = ++currentCallId;
  const container = getEBD3("space-filler-container");
  if (preferences["useSpaceFillerBlur"]) {
    container.classList.add("use-blur");
  } else {
    container.classList.remove("use-blur");
  }
  if (!container)
    return;
  if (!preferences["spaceFillersEnabled"]) {
    container.classList.remove("is-fading-out");
    container.style.animationDuration = "";
    container.replaceChildren();
    return;
  }
  const combinations = [
    ["circle1", "polygon4", "circle6", "triangle3", "triangle4", "polygon3", "polygon1", "circle2", "triangle5", "polygon6", "circle7"],
    ["polygon2", "triangle6", "circle5", "polygon1", "circle4", "triangle5", "circle1", "polygon5", "triangle3", "circle7", "triangle1"],
    ["circle3", "triangle1", "triangle7", "polygon6", "circle7", "polygon4", "circle1", "triangle4", "polygon2", "circle5"],
    ["circle6", "polygon4", "triangle3", "polygon1", "circle5", "triangle2", "polygon5", "circle2", "triangle7", "polygon3", "circle7"],
    ["circle1", "polygon2", "triangle6", "triangle4", "polygon5", "circle7", "polygon1", "circle3", "triangle5", "circle5", "polygon3"],
    ["polygon4", "triangle1", "circle3", "triangle2", "polygon3", "circle4", "polygon6", "triangle7", "circle1", "triangle6"],
    ["circle1", "triangle3", "polygon1", "triangle7", "polygon6", "circle2", "polygon2", "circle4", "triangle4", "polygon5", "circle5"],
    ["circle6", "polygon4", "triangle3", "polygon1", "triangle7", "polygon6", "circle7", "circle2", "triangle2", "polygon5", "circle4", "triangle5"],
    ["circle1", "triangle6", "polygon5", "triangle2", "circle7", "polygon3", "circle4", "triangle3", "polygon1", "circle3"],
    ["circle3", "polygon2", "triangle4", "polygon1", "triangle5", "circle2", "circle6", "polygon6", "triangle7", "circle4", "polygon5"]
  ];
  const transitionAnimations = preferences["transitionAnimations"];
  const spaceFillerAnimations = preferences["spaceFillerAnimations"];
  if (container.children.length > 0) {
    if (transitionAnimations) {
      container.classList.remove("is-fading-out");
      container.offsetWidth;
      container.classList.add("is-fading-out");
      await waitForAnimation2(container, transitionAnimations);
    }
  }
  if (callId !== currentCallId)
    return;
  container.classList.remove("is-fading-out");
  container.style.animationDuration = "";
  container.replaceChildren();
  let randNum;
  do {
    randNum = Math.floor(Math.random() * combinations.length);
  } while (combinations.length > 1 && randNum === lastCombinationIndex);
  lastCombinationIndex = randNum;
  const combination = combinations[randNum] || [];
  for (const shapeClass of combination) {
    if (callId !== currentCallId)
      return;
    const shapeElement = document.createElement(shapeElementType);
    const randomFloatClass = floatAnimations[Math.floor(Math.random() * floatAnimations.length)] || "";
    shapeElement.classList.add(baseShapeClass, shapeClass);
    if (transitionAnimations) {
      if (spaceFillerAnimations) {
        shapeElement.addEventListener("animationend", (event) => {
          if (event.animationName !== "fadeInShape")
            return;
          shapeElement.classList.remove("is-fading-in");
          shapeElement.classList.add(randomFloatClass, "is-floating");
        }, { once: true });
      }
      shapeElement.classList.add("is-fading-in");
    } else if (spaceFillerAnimations) {
      shapeElement.classList.add(randomFloatClass, "is-floating");
    }
    container.appendChild(shapeElement);
    if (transitionAnimations) {
      await wait(delay);
    }
  }
}
window.addEventListener("tabChange", () => {
  fillSpaceContainer();
});
window.addEventListener("preferencesUpdate", (event) => {
  const triggerPreferenceKeys = new Set([
    "spaceFillersEnabled",
    "spaceFillerAnimations",
    "useSpaceFillerBlur"
  ]);
  const eventDetails = event;
  const { preference } = eventDetails.detail;
  if (triggerPreferenceKeys.has(preference)) {
    fillSpaceContainer();
  }
});

// modules/tooltips.ts
var triggerSelector = [
  ".tooltip-button",
  ".tooltip-support-button",
  ".tooltip-delayed-button",
  ".tooltip-delayed-support-button",
  ".tooltip-support-delayed-button"
].join(", ");
var viewportPadding = 10;
var tooltipGap = 8;
var delayedTooltipWait = 750;
var tooltip = null;
var activeTrigger = null;
var touchFocusedTrigger = null;
var showTimer;
function initTooltips() {
  if (tooltip)
    return;
  tooltip = document.createElement("div");
  tooltip.className = "tooltip-popup";
  tooltip.id = "playpen-tooltip-popup";
  tooltip.setAttribute("role", "tooltip");
  document.body.append(tooltip);
  document.addEventListener("pointerover", handlePointerOver);
  document.addEventListener("pointerout", handlePointerOut);
  document.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("focusin", handleFocusIn);
  document.addEventListener("focusout", handleFocusOut);
  document.addEventListener("scroll", repositionTooltip, true);
  window.addEventListener("resize", repositionTooltip);
}
function findTrigger(target) {
  if (!(target instanceof Element))
    return null;
  return target.closest(triggerSelector);
}
function getTooltipContent(trigger) {
  const content = trigger.getAttribute("data-tooltip-content")?.trim();
  if (content)
    return content;
  return trigger.querySelector(".tooltip")?.textContent?.trim() ?? "";
}
function handlePointerOver(event) {
  if (event.pointerType === "touch")
    return;
  const trigger = findTrigger(event.target);
  if (!trigger || event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget))
    return;
  activateTooltip(trigger);
}
function handlePointerOut(event) {
  if (event.pointerType === "touch")
    return;
  const trigger = findTrigger(event.target);
  if (!trigger || event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget))
    return;
  if (trigger === activeTrigger && !trigger.matches(":focus-within"))
    hideTooltip();
}
function handlePointerDown(event) {
  if (event.pointerType === "touch") {
    const trigger = findTrigger(event.target);
    touchFocusedTrigger = trigger;
    if (trigger)
      activateTooltip(trigger);
    else
      hideTooltip();
    return;
  }
  touchFocusedTrigger = null;
}
function handleFocusIn(event) {
  const trigger = findTrigger(event.target);
  if (trigger && trigger !== touchFocusedTrigger)
    showTooltip(trigger);
}
function handleFocusOut(event) {
  const trigger = findTrigger(event.target);
  if (!trigger || event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget))
    return;
  const wasTouchFocused = trigger === touchFocusedTrigger;
  if (wasTouchFocused)
    touchFocusedTrigger = null;
  if (trigger === activeTrigger && (wasTouchFocused || !trigger.matches(":hover")))
    hideTooltip();
}
function activateTooltip(trigger) {
  clearTimeout(showTimer);
  if (trigger.classList.contains("tooltip-delayed-button") || trigger.classList.contains("tooltip-delayed-support-button") || trigger.classList.contains("tooltip-support-delayed-button")) {
    hideTooltip();
    activeTrigger = trigger;
    showTimer = setTimeout(() => showTooltip(trigger), delayedTooltipWait);
  } else {
    showTooltip(trigger);
  }
}
function showTooltip(trigger) {
  if (!tooltip)
    return;
  clearTimeout(showTimer);
  if (activeTrigger && activeTrigger !== trigger)
    removeDescription(activeTrigger);
  activeTrigger = trigger;
  const content = getTooltipContent(trigger);
  if (!content) {
    hideTooltip();
    return;
  }
  tooltip.innerHTML = content;
  tooltip.classList.toggle("primary", trigger.querySelector(".tooltip.primary") !== null);
  addDescription(trigger);
  repositionTooltip();
  tooltip.classList.add("is-visible");
}
function hideTooltip() {
  clearTimeout(showTimer);
  if (activeTrigger)
    removeDescription(activeTrigger);
  activeTrigger = null;
  tooltip?.classList.remove("is-visible");
}
function removeDescription(trigger) {
  const descriptions = (trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== tooltip?.id);
  if (descriptions.length)
    trigger.setAttribute("aria-describedby", descriptions.join(" "));
  else
    trigger.removeAttribute("aria-describedby");
}
function repositionTooltip() {
  if (!tooltip || !activeTrigger || !tooltip.textContent)
    return;
  const triggerRect = activeTrigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const preferredSide = activeTrigger.classList.contains("tip-top") ? "top" : activeTrigger.classList.contains("tip-left") ? "left" : activeTrigger.classList.contains("tip-right") ? "right" : "bottom";
  const sides = [preferredSide, ...["top", "right", "bottom", "left"].filter((side) => side !== preferredSide)];
  function positionFor(side) {
    let x = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
    let y = triggerRect.bottom + tooltipGap;
    if (side === "top")
      y = triggerRect.top - tooltipRect.height - tooltipGap;
    if (side === "left") {
      x = triggerRect.left - tooltipRect.width - tooltipGap;
      y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
    }
    if (side === "right") {
      x = triggerRect.right + tooltipGap;
      y = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
    }
    const fits = x >= viewportPadding && y >= viewportPadding && x + tooltipRect.width <= window.innerWidth - viewportPadding && y + tooltipRect.height <= window.innerHeight - viewportPadding;
    return { x, y, fits };
  }
  const position = sides.map(positionFor).find((candidate) => candidate.fits) ?? positionFor(preferredSide);
  const maxX = Math.max(viewportPadding, window.innerWidth - tooltipRect.width - viewportPadding);
  const maxY = Math.max(viewportPadding, window.innerHeight - tooltipRect.height - viewportPadding);
  tooltip.style.left = `${Math.max(viewportPadding, Math.min(position.x, maxX))}px`;
  tooltip.style.top = `${Math.max(viewportPadding, Math.min(position.y, maxY))}px`;
}
function addDescription(trigger) {
  const descriptions = (trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
  if (!descriptions.includes(tooltip.id))
    descriptions.push(tooltip.id);
  trigger.setAttribute("aria-describedby", descriptions.join(" "));
}

// modules/fileLoader.ts
async function populateSVGs(rpcFetchSvg) {
  const placeholders = document.querySelectorAll("svgPlaceholder, svgplaceholder");
  for (const placeholder of Array.from(placeholders)) {
    const path = placeholder.textContent?.trim();
    if (!path) {
      console.warn("Found an <svgPlaceholder> without a valid file path inside.");
      placeholder.remove();
      continue;
    }
    try {
      let svgText = "";
      if (rpcFetchSvg) {
        svgText = await rpcFetchSvg(path);
      } else {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }
        svgText = await response.text();
      }
      const parser = new DOMParser;
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
      const svgElement = svgDoc.querySelector("svg");
      if (!svgElement || svgDoc.querySelector("parsererror")) {
        throw new Error(`No valid <svg> tag found in file at path: "${path}"`);
      }
      for (const attribute of Array.from(placeholder.attributes)) {
        svgElement.setAttribute(attribute.name, attribute.value);
      }
      placeholder.replaceWith(svgElement);
    } catch (error) {
      console.error(`Failed to load SVG from path "${path}":`, error);
      placeholder.remove();
    }
  }
}

// modules/index.ts
var isFinishing = false;
var initialization = null;
function init4() {
  if (!initialization) {
    initialization = initialize().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}
async function initialize() {
  console.log("Initializing Website");
  initTooltips();
  try {
    await init2();
  } catch {}
  try {
    await populateSVGs();
  } catch {
    try {
      await populateSVGs();
    } catch {}
  }
  try {
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Tab")
        return;
      const selector = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
      const focusables = Array.from(document.querySelectorAll(selector)).filter((el) => {
        const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
        const isNotDisabled = !el.hasAttribute("disabled");
        return isVisible && isNotDisabled;
      });
      if (focusables.length === 0)
        return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      const activeElement = document.activeElement;
      if (lastEl && event.shiftKey && activeElement === firstEl) {
        lastEl.focus();
        event.preventDefault();
      } else if (firstEl && !event.shiftKey && activeElement === lastEl) {
        firstEl.focus();
        event.preventDefault();
      }
    });
  } catch {}
  try {
    init3();
  } catch {}
  setTimeout(finishLoading, 750);
}
async function finishLoading() {
  if (isFinishing)
    return;
  isFinishing = true;
  goto("main", { logPrevious: false, removePrevious: true });
}
function checkLoadState() {
  if (document.readyState === "complete") {
    init4();
  } else {
    window.addEventListener("load", () => void init4(), { once: true });
  }
}
document.addEventListener("DOMContentLoaded", () => {
  console.log("Website has finished loading DOM content");
  checkLoadState();
});
export {
  init4 as init
};
