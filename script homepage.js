// ページ読み込み時のフェードイン演出
document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll("section, header, footer");
  sections.forEach((el, i) => {
    el.style.opacity = 0;
    el.style.transition = "opacity 0.6s ease";
    setTimeout(() => {
      el.style.opacity = 1;
    }, 200 + i * 150);
  });
});

// スクロール時に機能ボックスをふわっと表示
window.addEventListener("scroll", () => {
  const boxes = document.querySelectorAll(".feature-box");
  boxes.forEach(box => {
    const rect = box.getBoundingClientRect();
    if (rect.top < window.innerHeight - 50) {
      box.classList.add("visible");
    }
  });
});