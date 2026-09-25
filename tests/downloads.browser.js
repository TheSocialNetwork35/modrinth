async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const api = "https://api.modrinth.com/v2/user/8Fjco3gC/projects";
  const assert = (value, message) => { if (!value) throw new Error(message); };
  let payload = [
    { id: "zHbMgWKx", slug: "freecam_yannis_", title: "FreeCam", project_type: "mod", status: "approved", icon_url: null, downloads: 12000 },
    { id: "Abcd1234", slug: "new-pack", title: "New Pack", project_type: "resourcepack", status: "approved", icon_url: null, downloads: 345 },
  ];
  let responseStatus = 200;
  let requests = 0;
  await page.unrouteAll();
  await page.route("https://formspree.io/**", route => route.abort());
  await page.route(api, route => {
    requests++;
    return route.fulfill({status: responseStatus, contentType: "application/json", body: JSON.stringify(payload)});
  });
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(origin + "/project/freecam");
  await page.waitForFunction(() => document.querySelector(".downloads-value")?.dataset.value === "12345");
  await page.clock.runFor(2000);
  assert(await page.locator("#project-id").inputValue() === "zHbMgWKx", "Project paths must select the matching form");
  assert(await page.locator("#feedback-heading").innerText() === "Feedback for FreeCam", "The form heading must match the project");
  assert(await page.locator(".project-downloads").allTextContents().then(values => values.join("|")) === "12,000 downloads|345 downloads", "Per-project counts must match the API");
  const pixels = () => page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    return { ink: data.filter((v, i) => i % 4 === 3 && v > 0).length, hash: data.reduce((sum, n, i) => (sum + n * (i % 97)) % 1000000007, 0) };
  });
  const before = await pixels();
  assert(before.ink > 100, "TechText must draw visible text");
  await page.clock.runFor(1200);
  assert((await pixels()).hash !== before.hash, "TechText must animate");
  const transforms = () => page.locator(".counter-number").evaluateAll(items => items.map(item => getComputedStyle(item).transform).join("|"));
  const oldTransforms = await transforms();
  const beforeRequests = requests;
  await page.clock.runFor(10000);
  assert(requests === beforeRequests, "Do not poll more frequently than 30 seconds");
  assert(await page.locator(".downloads-value").getAttribute("data-value") === "12345", "The counter must not invent downloads");
  payload = payload.map((project, i) => i ? project : {...project, downloads: 12011});
  await page.locator("#message").fill("Keep my message while the download counter updates.");
  await page.clock.fastForward(31000);
  await page.waitForFunction(() => document.querySelector(".downloads-value").dataset.value === "12356");
  await page.clock.runFor(150);
  assert(await transforms() !== oldTransforms, "Counter digits must roll when real data changes");
  assert(await page.locator("#message").inputValue() === "Keep my message while the download counter updates.", "Download updates must preserve form input");
  assert(await page.locator("#project-id").inputValue() === "zHbMgWKx", "Download updates must preserve selected project");
  await page.clock.runFor(2000);
  const checkedAt = await page.locator(".downloads-freshness time").getAttribute("datetime");
  responseStatus = 503;
  await page.clock.fastForward(31000);
  await page.waitForFunction(() => document.querySelector(".downloads-freshness").dataset.state === "stale");
  assert(await page.locator(".downloads-value").getAttribute("data-value") === "12356", "Keep last known data during an outage");
  assert(await page.locator(".downloads-freshness time").getAttribute("datetime") === checkedAt, "Do not advance the freshness timestamp on failure");
  responseStatus = 200;
  payload = payload.map((project, i) => i ? project : {...project, downloads: 12001});
  await page.clock.fastForward(31000);
  await page.waitForFunction(() => document.querySelector(".downloads-value").dataset.value === "12346");
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height:900});
    await page.clock.runFor(300);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Layout overflow at " + width);
    assert((await pixels()).ink > 100, "TechText must remain visible at " + width);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForFunction(() => document.querySelector(".downloads-value")?.dataset.value === "12346");
  assert(await page.locator("canvas").count() === 0, "Reduced motion must use a static title");
  assert(await page.locator(".counter-number").count() === 0, "Reduced motion must use a static counter");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.unrouteAll();
  await page.evaluate(() => localStorage.removeItem("modrinth-project-feedback:v2"));
  await page.clock.resume();
  await page.goto(origin + "/");
  return {passed:true, checks:["exact totals", "per-project downloads", "automatic project form", "nonblank animated canvas", "30-second polling", "no fabricated growth", "rolling digits", "preserved form drafts", "stale state", "API corrections", "responsive layout", "reduced motion"]};
}
