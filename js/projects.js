(() => {
  const timeline = document.getElementById("project-timeline");
  const ruler = document.getElementById("timeline-ruler");
  const status = document.getElementById("timeline-status");
  if (!timeline || !ruler || !status) return;

  const years = Array.from({ length: 13 }, (_, index) => 2014 + index);
  let projectRows = [];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function yearRange(project) {
    if (project.startYear === project.endYear) return String(project.startYear);
    return `${project.startYear}–${project.endYear}${project.status === "Ongoing" ? " +" : ""}`;
  }

  function renderRuler() {
    ruler.replaceChildren();
    ruler.append(element("span", "timeline-ruler-spacer", "Project"));
    const yearTrack = element("div", "timeline-year-track");
    for (const year of years) {
      yearTrack.append(element("span", "timeline-year", String(year)));
    }
    ruler.append(yearTrack);
  }

  function renderProject(project) {
    const details = element("details", "timeline-project");
    details.dataset.start = String(project.startYear);
    details.dataset.end = String(project.endYear);

    const summary = element("summary", "timeline-summary");
    const label = element("span", "timeline-project-label");
    label.append(element("strong", "timeline-project-title", project.title));
    label.append(element("span", "timeline-project-range", yearRange(project)));
    summary.append(label);

    const track = element("span", "timeline-track");
    const bar = element("span", "timeline-bar");
    const startColumn = project.startYear - years[0] + 1;
    const endColumn = project.endYear - years[0] + 2;
    bar.style.gridColumn = `${startColumn} / ${endColumn}`;
    if (startColumn === endColumn - 1) bar.classList.add("is-single-year");
    track.append(bar);
    summary.append(track);
    details.append(summary);

    const content = element("div", "timeline-detail");
    content.append(element("p", "timeline-description", project.description || "No additional description is available yet."));

    const metadata = [...(project.metadata || [])];
    if (metadata.length) {
      const tags = element("div", "timeline-tags");
      for (const item of metadata) tags.append(element("span", "timeline-tag", item));
      content.append(tags);
    }

    if (project.links?.length) {
      const links = element("div", "timeline-links");
      for (const item of project.links) {
        const link = element("a", "", item.label);
        link.href = item.url;
        if (/^https?:\/\//i.test(item.url)) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        links.append(link);
      }
      content.append(links);
    }

    details.append(content);
    return details;
  }

  function filterProjects(year) {
    for (const row of projectRows) {
      const matches = year === "all" ||
        (Number(year) >= Number(row.dataset.start) && Number(year) <= Number(row.dataset.end));
      row.hidden = !matches;
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-year-filter]");
    if (!button) return;
    const selectedYear = button.dataset.yearFilter;
    document.querySelectorAll("[data-year-filter]").forEach((filter) => {
      const active = filter.dataset.yearFilter === selectedYear;
      filter.classList.toggle("is-active", active);
      filter.setAttribute("aria-pressed", String(active));
    });
    filterProjects(selectedYear);
  });

  renderRuler();
  fetch("data/projects.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load project data (${response.status}).`);
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data.projects)) throw new Error("Project data is not in the expected format.");
      const fragment = document.createDocumentFragment();
      for (const project of data.projects) {
        if (!Number.isInteger(project.startYear) || !Number.isInteger(project.endYear) ||
            project.startYear < years[0] || project.endYear > years[years.length - 1] ||
            project.endYear < project.startYear) {
          throw new Error(`Invalid activity range for ${project.title || "a project"}.`);
        }
        fragment.append(renderProject(project));
      }
      timeline.replaceChildren(fragment);
      projectRows = Array.from(timeline.querySelectorAll(".timeline-project"));
      status.hidden = true;
      const selected = document.querySelector(".timeline-filter.is-active");
      if (selected) filterProjects(selected.dataset.yearFilter);
    })
    .catch((error) => {
      status.textContent = error.message;
    });
})();
