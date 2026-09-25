const FORMSPREE_ENDPOINT = "https://formspree.io/f/mjgnjvvb";

const PROJECTS_ENDPOINT = "https://api.modrinth.com/v2/user/8Fjco3gC/projects";
const PROJECT_CACHE_KEY = "modrinth-project-feedback:v1";
const PROJECT_REFRESH_MS = 5 * 60 * 1000;
const FALLBACK_ICON = "assets/brand/project-feedback-logo.png";
const PROJECT_TYPES = new Map([
  ["mod", ["Mod", "Mods"]],
  ["resourcepack", ["Resource pack", "Resource packs"]],
  ["modpack", ["Modpack", "Modpacks"]],
  ["shader", ["Shader", "Shaders"]],
  ["datapack", ["Data pack", "Data packs"]],
  ["plugin", ["Plugin", "Plugins"]],
]);
// Preserve feedback URLs published before the live catalog used Modrinth IDs.
const PROJECT_ALIASES = new Map([
  ["freecam", "zHbMgWKx"],
  ["pvp-essentials", "oW4rBPFN"],
  ["screenshot-to-clipboard", "ulMLQfNL"],
  ["smaller-tools", "pYxljKUU"],
]);
const projectGrid = document.querySelector("#project-grid");
const projectStatus = document.querySelector("#project-status");
let projects = Object.fromEntries(
  [...projectGrid.querySelectorAll(".project-card")].map((card) => [
    card.dataset.project,
    {
      id: card.dataset.projectId,
      slug: card.dataset.project,
      type: card.dataset.projectType,
      name: card.querySelector("strong").textContent,
      image: card.querySelector("img").getAttribute("src"),
    },
  ]),
);
let lastProjectAttempt = 0;
let projectRequestPending = false;

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
    projectSelect.value = "";
    preview.hidden = true;
    subject.value = "New project feedback";
    document.querySelector("#project-id").value = "";
    document.querySelector("#project-url").value = "";
  } else {
    projectSelect.value = project.name;
    previewImage.src = project.image;
    previewImage.alt = `${project.name} icon`;
    previewName.textContent = project.name;
    preview.hidden = false;
    subject.value = `New ${project.name} feedback`;
    document.querySelector("#project-id").value = project.id;
    document.querySelector("#project-url").value =
      `https://modrinth.com/project/${project.id}`;
    clearFieldError(projectSelect);
  }

  if (updateUrl) {
    const url = new URL(window.location.href);
    if (project) url.searchParams.set("project", project.id);
    else url.searchParams.delete("project");
    url.hash = "feedback";
    window.history.replaceState({}, "", url);
  }
}

function resolveProject(key) {
  const id = PROJECT_ALIASES.get(key) || key;
  return Object.values(projects).find(
    (project) => project.id === id || project.slug === key,
  )?.slug;
}

function normalizeProjects(payload) {
  if (!Array.isArray(payload)) throw new Error("Invalid project catalog");
  const normalized = payload
    .filter(
      (project) => project && ["approved", "archived"].includes(project.status),
    )
    .map((project) => {
      if (
        !/^[a-zA-Z0-9]{8}$/.test(project.id) ||
        typeof project.slug !== "string" ||
        !/^[\w-]+$/.test(project.slug) ||
        typeof project.title !== "string" ||
        !project.title.trim() ||
        typeof project.project_type !== "string"
      )
        throw new Error("Invalid project");
      let image = FALLBACK_ICON;
      try {
        const url = new URL(project.icon_url);
        if (url.protocol === "https:" && url.hostname === "cdn.modrinth.com")
          image = url.href;
      } catch {
        // A missing icon should never prevent selecting a project.
      }
      return {
        id: project.id,
        slug: project.slug,
        name: project.title,
        type: project.project_type,
        image,
      };
    });
  return normalized.sort(
    (a, b) =>
      a.type.localeCompare(b.type) || a.name.localeCompare(b.name, "en"),
  );
}

function renderProjects(catalog) {
  const previous = projects[getSlugByProjectName(projectSelect.value)];
  const selectedKey =
    previous?.id || new URLSearchParams(location.search).get("project");
  const signature = (items) =>
    JSON.stringify([...items].sort((a, b) => a.id.localeCompare(b.id)));
  if (signature(Object.values(projects)) === signature(catalog)) return;
  const focusedProject =
    document.activeElement.closest?.(".project-card")?.dataset.projectId;
  projects = Object.fromEntries(
    catalog.map((project) => [project.slug, project]),
  );
  const groups = new Map();
  for (const project of catalog) {
    if (!groups.has(project.type)) groups.set(project.type, []);
    groups.get(project.type).push(project);
  }
  const grid = document.createDocumentFragment();
  const options = document.createDocumentFragment();
  options.append(new Option("Select a project", ""));
  for (const [type, entries] of groups) {
    const [label, plural] = PROJECT_TYPES.get(type) || [
      "Project",
      "Other projects",
    ];
    const group = document.createElement("div");
    group.className = "project-group";
    const heading = document.createElement("h3");
    heading.textContent = plural;
    group.append(heading);
    const optgroup = document.createElement("optgroup");
    optgroup.label = plural;
    for (const project of entries) {
      const card = document.createElement("a");
      card.className = "project-card";
      card.href = `?project=${encodeURIComponent(project.id)}#feedback`;
      card.dataset.project = project.slug;
      card.dataset.projectId = project.id;
      card.dataset.projectType = project.type;
      const image = document.createElement("img");
      image.src = project.image;
      image.alt = "";
      image.width = 42;
      image.height = 42;
      image.loading = "lazy";
      const meta = document.createElement("span");
      meta.className = "project-meta";
      const name = document.createElement("strong");
      name.textContent = project.name;
      const kind = document.createElement("small");
      kind.textContent = label;
      meta.append(name, kind);
      const arrow = document.createElement("span");
      arrow.className = "card-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      card.append(image, meta, arrow);
      group.append(card);
      optgroup.append(new Option(project.name, project.name));
    }
    grid.append(group);
    options.append(optgroup);
  }
  projectGrid.replaceChildren(grid);
  projectSelect.replaceChildren(options);
  document.querySelector(".project-count").textContent =
    `${catalog.length} ${catalog.length === 1 ? "project" : "projects"}`;
  setSelectedProject(resolveProject(selectedKey));
  if (focusedProject) {
    const card = [...projectGrid.querySelectorAll(".project-card")].find(
      (item) => item.dataset.projectId === focusedProject,
    );
    (card || projectSelect).focus({ preventScroll: true });
  }
}

async function refreshProjects() {
  if (
    document.hidden ||
    projectRequestPending ||
    Date.now() - lastProjectAttempt < PROJECT_REFRESH_MS
  )
    return;
  lastProjectAttempt = Date.now();
  projectRequestPending = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(PROJECTS_ENDPOINT, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Project catalog unavailable");
    const payload = await response.json();
    renderProjects(normalizeProjects(payload));
    projectStatus.textContent = Object.keys(projects).length
      ? ""
      : "No public projects yet.";
    projectStatus.hidden = !projectStatus.textContent;
    try {
      // Cache only public catalog fields, never form values or credentials.
      const entries = payload
        .filter(
          (project) =>
            project && ["approved", "archived"].includes(project.status),
        )
        .map(({ id, slug, title, project_type, icon_url, status }) => ({
          id,
          slug,
          title,
          project_type,
          icon_url,
          status,
        }));
      localStorage.setItem(
        PROJECT_CACHE_KEY,
        JSON.stringify({ savedAt: Date.now(), projects: entries }),
      );
    } catch {
      // The form also works when browser storage is unavailable.
    }
  } catch {
    projectStatus.textContent =
      "Updates are temporarily unavailable. You can still send feedback for the projects shown.";
    projectStatus.hidden = false;
  } finally {
    clearTimeout(timeout);
    projectRequestPending = false;
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
  const validatedFields = [
    [projectSelect, "Choose a project."],
    [
      document.querySelector("#minecraft-version"),
      "Enter the Minecraft version.",
    ],
    [document.querySelector("#email"), "Enter a valid email address."],
    [
      message,
      "Please add at least 20 characters so the feedback is actionable.",
    ],
  ];

  validatedFields.forEach(([field, errorText]) => {
    clearFieldError(field);
    if (!field.checkValidity()) {
      setFieldError(field, errorText);
      firstInvalidField ||= field;
    }
  });

  const selectedType = form.querySelector('input[name="type"]:checked');
  const typeError = document.querySelector("#type-error");
  typeError.textContent = selectedType
    ? ""
    : "Choose Problem, Feature, or Improvement.";
  firstInvalidField ||= selectedType
    ? null
    : form.querySelector('input[name="type"]');

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
  submitButton.setAttribute(
    "aria-label",
    isLoading ? "Sending feedback" : "Send feedback",
  );
}

function showStatus(type, text) {
  status.className = `form-status full-width is-${type}`;
  status.textContent = text;
}

projectGrid.addEventListener("click", (event) => {
  const card = event.target.closest(".project-card");
  if (!card || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  setSelectedProject(card.dataset.project, true);
  document.querySelector("#feedback").scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
  projectSelect.focus({ preventScroll: true });
});

projectSelect.addEventListener("change", () => {
  const slug = getSlugByProjectName(projectSelect.value);
  setSelectedProject(slug, true);
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

  const selectedProject = projectSelect.value;
  const selectedId = document.querySelector("#project-id").value;
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
      let errorMessage =
        "Your message could not be sent. Please try again in a moment.";
      const payload = await response.json().catch(() => null);
      if (payload?.errors?.length) {
        errorMessage = payload.errors.map((error) => error.message).join(" ");
      }
      throw new Error(errorMessage);
    }

    form.reset();
    characterCount.textContent = "0 / 3000";
    setSelectedProject(resolveProject(selectedId));
    showStatus(
      "success",
      `Thanks! Your ${selectedProject} feedback was sent successfully. I’ll take a look soon.`,
    );
  } catch (error) {
    showStatus(
      "error",
      error.message ||
        "Your message could not be sent. Please check your connection and try again.",
    );
  } finally {
    setLoading(false);
  }
});

document.addEventListener(
  "error",
  (event) => {
    const image = event.target;
    if (
      image instanceof HTMLImageElement &&
      image.getAttribute("src") !== FALLBACK_ICON
    )
      image.src = FALLBACK_ICON;
  },
  true,
);

const initialProject = new URLSearchParams(window.location.search).get(
  "project",
);
setSelectedProject(resolveProject(initialProject));
try {
  const cached = JSON.parse(localStorage.getItem(PROJECT_CACHE_KEY));
  if (
    cached &&
    Number.isFinite(cached.savedAt) &&
    Date.now() - cached.savedAt < 24 * 60 * 60 * 1000
  ) {
    renderProjects(normalizeProjects(cached.projects));
  }
} catch {
  // Use the HTML snapshot if storage is unavailable or corrupt.
}
void refreshProjects();
setInterval(() => void refreshProjects(), PROJECT_REFRESH_MS);
document.addEventListener("visibilitychange", () => void refreshProjects());
