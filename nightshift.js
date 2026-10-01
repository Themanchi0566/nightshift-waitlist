/* ---------- Waitlist setup ----------
   Connects to backend API for form submissions */
const CONFIG = { endpoint: "/api/waitlist" };

async function saveEntry(entry) {
  if (CONFIG.endpoint) {
    const res = await fetch(CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(entry)
    });
    if (!res.ok) throw new Error("request-failed");
    return await res.json();
  }
  throw new Error("not-connected");
}

document.querySelectorAll(".wl-form").forEach(form => {
  const msg = form.querySelector(".wl-msg");
  const btn = form.querySelector("button");
  
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const email = form.email.value.trim();
    msg.className = "wl-msg";
    
    if (form.company.value) return; // honeypot
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = "Enter a valid email address, like you@email.com.";
      msg.classList.add("err");
      return;
    }
    
    btn.disabled = true;
    try {
      await saveEntry({ 
        email, 
        goal: form.goal.value, 
        joined: new Date().toISOString() 
      });
      msg.textContent = "You're on the list. We'll email you when your invite is ready.";
      msg.classList.add("ok");
      form.reset();
    } catch (err) {
      msg.textContent = err.message === "not-connected"
        ? "The waitlist isn't connected to an inbox yet. Add your form endpoint to finish setup."
        : "We couldn't save your spot. Check your connection and try again.";
      msg.classList.add("err");
    } finally {
      btn.disabled = false;
    }
  });
});

/* ---------- Hero queue: completes once, in order ---------- */
(function() {
  const items = document.querySelectorAll("#queue li");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
  items.forEach((li, i) => {
    if (still) li.classList.add("done");
    else setTimeout(() => li.classList.add("done"), 500 + i * 750);
  });
})();
