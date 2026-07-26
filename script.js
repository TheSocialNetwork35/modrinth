const FORMSPREE_ENDPOINT = "https://formspree.io/f/mjgnjvvb";

const projects = {
  "fence-jump-plus": {
    name: "Fence Jump Plus",
    image: "assets/projects/fence-jump-plus.png",
  },
  freecam: {
    name: "FreeCam",
    image: "assets/projects/freecam.png",
  },
  "mini-spear": {
    name: "Mini Spear",
    image: "assets/projects/mini-spear.png",
  },
  "pvp-essentials": {
    name: "PvP Essentials",
    image: "assets/projects/pvp-essentials.png",
  },
  "screenshot-to-clipboard": {
    name: "Screenshot to Clipboard",
    image: "assets/projects/screenshot-to-clipboard.png",
  },
  "smaller-tools": {
    name: "Smaller Tools",
    image: "assets/projects/smaller-tools.png",
  },
};

const form = document.querySelector("#feedback-form");
const projectSelect = document.querySelector("#project");
const preview = document.querySelector("#selected-preview");
const previewImage = document.querySelector("#selected-project-image");
const previewName = document.querySelector("#selected-project-name");
const subject = document.querySelector("#form-subject");
const message = document.querySelector("#message");
const characterCount = document.querySelector("#character-count");
const submitButton = form.querySelector(".submit-button");
const status = document.querySelector("#form-status");

function setSelectedProject(slug, updateUrl = false) {
  const project = projects[slug];

  document.querySelectorAll(".project-card").forEach((card) => {
    if (card.dataset.project === slug) {
      card.setAttribute("aria-current", "true");
    } else {
      card.removeAttribute("aria-current");
    }
  });

  if (!project) {
    preview.hidden = true;
    return;
  }

  projectSelect.value = project.name;
  previewImage.src = project.image;
  previewImage.alt = `${project.name} icon`;
  previewName.textContent = project.name;
  preview.hidden = false;
  subject.value = `New ${project.name} feedback`;
  clearFieldError(projectSelect);

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set("project", slug);
    url.hash = "feedback";
    window.history.replaceState({}, "", url);
  }
}

function getSlugByProjectName(name) {
  return Object.keys(projects).find((slug) => projects[slug].name === name);
}

function clearFieldError(field) {
  const error = document.querySelector(`#${field.id}-error`);
  field.removeAttribute("aria-invalid");
  field.removeAttribute("aria-describedby");
  if (error) error.textContent = "";
}

function setFieldError(field, text) {
  const error = document.querySelector(`#${field.id}-error`);
  field.setAttribute("aria-invalid", "true");
  if (error) {
    error.textContent = text;
    field.setAttribute("aria-describedby", error.id);
  }
}

function validateForm() {
  let firstInvalidField = null;
  const requiredFields = [
    [projectSelect, "Choose a project."],
    [document.querySelector("#minecraft-version"), "Enter the Minecraft version."],
    [document.querySelector("#name"), "Enter your name."],
    [document.querySelector("#email"), "Enter a valid email address."],
    [message, "Please add at least 20 characters so the feedback is actionable."],
  ];

  requiredFields.forEach(([field, errorText]) => {
    clearFieldError(field);
    if (!field.checkValidity()) {
      setFieldError(field, errorText);
      firstInvalidField ||= field;
    }
  });

  const selectedType = form.querySelector('input[name="type"]:checked');
  const typeError = document.querySelector("#type-error");
  typeError.textContent = selectedType ? "" : "Choose Problem, Feature, or Improvement.";
  firstInvalidField ||= selectedType ? null : form.querySelector('input[name="type"]');

  if (firstInvalidField) {
    firstInvalidField.focus();
    return false;
  }

  return true;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.classList.toggle("is-loading", isLoading);
  submitButton.setAttribute("aria-busy", String(isLoading));
  submitButton.setAttribute("aria-label", isLoading ? "Sending feedback" : "Send feedback");
}

function showStatus(type, text) {
  status.className = `form-status full-width is-${type}`;
  status.textContent = text;
}

document.querySelectorAll(".project-card").forEach((card) => {
  card.addEventListener("click", (event) => {
    event.preventDefault();
    setSelectedProject(card.dataset.project, true);
    document.querySelector("#feedback").scrollIntoView({ behavior: "smooth" });
  });
});

projectSelect.addEventListener("change", () => {
  const slug = getSlugByProjectName(projectSelect.value);
  if (slug) {
    setSelectedProject(slug, true);
  } else {
    preview.hidden = true;
    document.querySelectorAll(".project-card").forEach((card) => card.removeAttribute("aria-current"));
  }
});

form.querySelectorAll("input, select, textarea").forEach((field) => {
  field.addEventListener("input", () => {
    if (field.id) clearFieldError(field);
    status.className = "form-status full-width";
  });
});

form.querySelectorAll('input[name="type"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    document.querySelector("#type-error").textContent = "";
  });
});

message.addEventListener("input", () => {
  characterCount.textContent = `${message.value.length} / 3000`;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.className = "form-status full-width";

  if (!validateForm()) return;

  setLoading(true);

  try {
    const response = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      body: new FormData(form),
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      let errorMessage = "Your message could not be sent. Please try again in a moment.";
      const payload = await response.json().catch(() => null);
      if (payload?.errors?.length) {
        errorMessage = payload.errors.map((error) => error.message).join(" ");
      }
      throw new Error(errorMessage);
    }

    const selectedProject = projectSelect.value;
    const selectedSlug = getSlugByProjectName(selectedProject);
    form.reset();
    characterCount.textContent = "0 / 3000";
    if (selectedSlug) setSelectedProject(selectedSlug);
    showStatus(
      "success",
      `Thanks! Your ${selectedProject} feedback was sent successfully. I’ll take a look soon.`,
    );
  } catch (error) {
    showStatus(
      "error",
      error.message || "Your message could not be sent. Please check your connection and try again.",
    );
  } finally {
    setLoading(false);
  }
});

const initialProject = new URLSearchParams(window.location.search).get("project");
if (initialProject && projects[initialProject]) {
  setSelectedProject(initialProject);
}
