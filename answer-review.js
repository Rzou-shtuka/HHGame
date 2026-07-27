(() => {
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  (async () => {
    try {
      await loadScript("./answer-key.js?v=1");
      await loadScript("./auto-check.js?v=1");
    } catch (error) {
      console.error("自动判题功能加载失败：", error);
      window.alert("自动判题功能加载失败，请刷新网页重试。");
    }
  })();
})();
