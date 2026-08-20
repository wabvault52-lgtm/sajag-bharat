// Minimal vanilla JS — no framework, no build step.
(function () {
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("primaryNav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", function () {
    var isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
})();
