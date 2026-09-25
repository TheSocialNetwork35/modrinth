async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const api = "https://api.modrinth.com/v2/user/8Fjco3gC/projects";
  const cacheKey = "modrinth-project-feedback:v2";
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const fixture = [
    {
      id: "zHbMgWKx",
      slug: "freecam_yannis_",
      title: "FreeCam",
      project_type: "mod",
      status: "approved",
      icon_url: null,
    },
    {
      id: "Abcd1234",
      slug: "new-pack",
      title: "A new pack",
      project_type: "resourcepack",
      status: "approved",
      icon_url: null,
    },
    {
      id: "Efgh5678",
      slug: "another-mod",
      title: "Another mod",
      project_type: "mod",
      status: "approved",
      icon_url: "https://untrusted.example/icon.png",
    },
    {
      id: "Priv1234",
      slug: "private-project",
      title: "Private project",
      project_type: "mod",
      status: "private",
      icon_url: null,
    },
  ];
  let payload = fixture;
  let apiStatus = 200;
  let sendStatus = 200;
  let submitted = "";
  let apiRequests = 0;
  await page.unrouteAll();
  await page.route(api, (route) => {
    apiRequests += 1;
    return route.fulfill({
      status: apiStatus,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
  await page.route("https://formspree.io/**", (route) => {
    submitted = route.request().postData();
    return route.fulfill({
      status: sendStatus,
      contentType: "application/json",
      body: "{}",
    });
  });
  await page.evaluate((key) => localStorage.removeItem(key), cacheKey);
  await page.clock.install();
  await page.goto(origin + "/?project=freecam");
  await page.waitForFunction(
    () => document.querySelectorAll(".project-card").length === 3,
  );
  assert(
    (await page.locator("#project-id").inputValue()) === "zHbMgWKx",
    "Old project links must resolve to the stable ID",
  );
  assert(
    JSON.stringify(
      await page.locator(".project-group h3").allTextContents(),
    ) === JSON.stringify(["Mods", "Resource packs"]),
    "Projects must be grouped by type",
  );
  assert(
    JSON.stringify(
      await page.locator(".project-card strong").allTextContents(),
    ) === JSON.stringify(["Another mod", "FreeCam", "A new pack"]),
    "Projects must sort alphabetically within each type",
  );
  assert(
    (await page.locator(".project-card img").first().getAttribute("src")) ===
      "/assets/brand/project-feedback-logo.png",
    "Untrusted or missing icon URLs must use the local fallback",
  );
  await page.locator(".project-card[data-project=new-pack]").click();
  assert(
    (await page.locator("#project").inputValue()) === "A new pack",
    "Dynamically added project cards must select the form project",
  );
  assert(
    (await page.evaluate(() =>
      location.pathname,
    )) === "/project/Abcd1234",
    "New links must use stable IDs",
  );
  await page.locator("#project").selectOption("");
  assert(
    (await page.locator("#form-subject").inputValue()) ===
      "New project feedback",
    "Clearing selection must reset the email subject",
  );
  assert(
    (await page.locator("#project-id").inputValue()) === "",
    "Clearing selection must reset metadata",
  );
  await page.getByRole("button", { name: "Send feedback" }).click();
  assert(
    (await page.locator("#project-error").innerText()) === "Choose a project.",
    "Required project validation must be shown",
  );
  assert(submitted === "", "Invalid forms must not send requests");
  await page.locator("#project").selectOption("FreeCam");
  await page.locator(".type-option").filter({ hasText: "Problem" }).click();
  await page.locator("#minecraft-version").fill("1.21.8");
  await page
    .locator("#message")
    .fill("This is a simulated browser test message, never sent.");
  sendStatus = 500;
  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.locator(".form-status.is-error").waitFor();
  assert(
    (await page.locator("#message").inputValue()) !== "",
    "Failed submissions must preserve the message",
  );
  sendStatus = 200;
  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.locator(".form-status.is-success").waitFor();
  assert(
    submitted.includes("zHbMgWKx"),
    "Submission must include the stable project ID",
  );
  assert(
    (await page.locator("#message").inputValue()) === "",
    "Successful submissions must reset the message",
  );

  // Revalidation must preserve selection and edits when the catalog changes.
  await page
    .locator("#message")
    .fill("Keep this draft while projects are being refreshed.");
  payload = fixture.map((project) =>
    project.id === "zHbMgWKx"
      ? { ...project, slug: "freecam-renamed", title: "FreeCam Renamed" }
      : project,
  );
  await page.clock.fastForward(30 * 1000 + 1000);
  await page.waitForFunction(
    () => document.querySelector("#project").value === "FreeCam Renamed",
  );
  assert(
    (await page.locator("#message").inputValue()) ===
      "Keep this draft while projects are being refreshed.",
    "Catalog refresh must preserve draft messages",
  );
  assert(
    (await page.locator("#project-id").inputValue()) === "zHbMgWKx",
    "Renames must preserve project identity",
  );

  apiStatus = 503;
  await page.reload();
  await page.locator("#project-status").waitFor();
  assert(
    (await page.locator(".project-card").count()) === 3,
    "API failure must preserve the cached catalog",
  );
  await page.evaluate((key) => localStorage.setItem(key, "{broken"), cacheKey);
  await page.reload();
  await page.locator("#project-status").waitFor();
  assert(
    (await page.locator(".project-card").count()) === 8,
    "A corrupt cache and API failure must preserve the HTML snapshot",
  );

  apiStatus = 200;
  payload = [
    { ...fixture[1], title: "<img src=x onerror=alert(1)>", icon_url: null },
  ];
  await page.reload();
  await page.waitForFunction(
    () => document.querySelectorAll(".project-card").length === 1,
  );
  assert(
    (await page.locator(".project-card strong").innerText()) ===
      payload[0].title,
    "API titles must render as text",
  );
  assert(
    (await page.locator(".project-card strong img").count()) === 0,
    "API titles must not inject markup",
  );
  await page.locator(".project-card").click();
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Horizontal overflow at " + width,
    );
  }
  payload = [];
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector(".project-count").textContent === "0 projects",
  );
  assert(
    (await page.locator(".project-card").count()) === 0,
    "An empty successful response must remove obsolete projects",
  );
  assert(
    (await page.locator("#project-id").inputValue()) === "",
    "Removed projects must clear the selection",
  );
  assert(
    (await page.locator("#project-status").innerText()) ===
      "No public projects yet.",
    "An empty catalog needs a visible state",
  );

  await page.unrouteAll();
  await page.clock.resume();
  await page.evaluate((key) => localStorage.removeItem(key), cacheKey);
  await page.goto(origin + "/");
  return {
    passed: true,
    apiRequests,
    checks: [
      "live additions",
      "grouping",
      "sorting",
      "legacy links",
      "stable IDs",
      "icon fallback",
      "metadata reset",
      "validation",
      "simulated send success and failure",
      "background refresh",
      "renamed projects",
      "draft preservation",
      "API outage",
      "corrupt cache",
      "safe titles",
      "five viewport widths",
      "empty catalog",
    ],
  };
}
