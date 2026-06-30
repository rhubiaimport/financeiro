const state = {
  data: BabyStorage.load(),
  screen: "inicio"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const formatDateTime = (value) => {
  if (!value) return "--";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const formatCountdown = (value) => {
  if (!value) return "--";
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Agora";
  const minutes = Math.round(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}min` : `${rest}min`;
};

const formatSaveTime = (value) => {
  if (!value) return "Dados protegidos neste aparelho";
  return `Salvo às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))}`;
};

const todayKey = () => new Date().toISOString().slice(0, 10);
const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const activeProfile = () => BabyStorage.getActiveProfile(state.data);
const safe = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);

const setDefaultDateTimes = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const date = local.slice(0, 10);
  ["#feedingTime", "#milkPrepared", "#medicineStart", "#appointmentTime"].forEach((selector) => {
    if ($(selector) && !$(selector).value) $(selector).value = local;
  });
  ["#growthDate"].forEach((selector) => {
    if ($(selector) && !$(selector).value) $(selector).value = date;
  });
};

const toast = (message) => {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2600);
};

const calculateAge = (birthDate) => {
  if (!birthDate) return "Configure o nascimento";
  const birth = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 1) {
    const days = Math.max(0, Math.floor((now - birth) / 86400000));
    return `${days} dia${days === 1 ? "" : "s"}`;
  }
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years > 0) return `${years} ano${years === 1 ? "" : "s"} e ${rest} mês${rest === 1 ? "" : "es"}`;
  return `${months} mês${months === 1 ? "" : "es"}`;
};

const nextFeedingTime = (profile) => {
  const latest = [...profile.feedings].sort((a, b) => new Date(b.nextAt) - new Date(a.nextAt))[0];
  return latest ? latest.nextAt : "";
};

const nextMedicineTime = (medicine) => {
  const start = new Date(medicine.startAt).getTime();
  const interval = Number(medicine.intervalHours) * 3600000;
  if (!start || !interval) return "";
  const elapsed = Date.now() - start;
  const cycles = elapsed <= 0 ? 0 : Math.ceil(elapsed / interval);
  return new Date(start + cycles * interval).toISOString();
};

const sortedUpcoming = (items, getDate) =>
  [...items]
    .map((item) => ({ item, date: getDate(item) }))
    .filter((entry) => entry.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

const removeRecord = (collection, id) => {
  if (!confirm("Remover este registro?")) return;
  BabyStorage.updateActiveProfile(state.data, (profile) => {
    profile[collection] = profile[collection].filter((item) => item.id !== id);
  });
  render();
  toast("Registro removido.");
};

const renderList = (selector, items, mapper) => {
  const node = $(selector);
  node.innerHTML = "";
  if (items.length === 0) {
    node.innerHTML = '<p class="empty">Nenhum registro ainda.</p>';
    return;
  }
  items.forEach((item) => node.insertAdjacentHTML("beforeend", mapper(item)));
};

const renderHome = (profile) => {
  $("#babyNameTitle").textContent = profile.name || "Meu Bebê";
  $("#babyInitial").textContent = (profile.name || "B").trim().charAt(0).toUpperCase();
  $("#babyAge").textContent = calculateAge(profile.birthDate);
  $("#currentWeight").textContent = profile.weight ? `${profile.weight} kg` : "--";
  $("#currentHeight").textContent = profile.height ? `${profile.height} cm` : "--";
  $("#nextFeeding").textContent = nextFeedingTime(profile) ? formatDateTime(nextFeedingTime(profile)) : "--";

  const validMilk = sortedUpcoming(profile.milk, (item) => item.expiresAt).find((entry) => new Date(entry.date) > new Date());
  $("#milkValidity").textContent = validMilk ? formatDateTime(validMilk.date) : "--";

  const medicine = sortedUpcoming(profile.medicines, nextMedicineTime)[0];
  $("#nextMedicine").textContent = medicine ? `${medicine.item.name} · ${formatCountdown(medicine.date)}` : "--";

  const appointment = sortedUpcoming(profile.appointments, (item) => item.time).find((entry) => new Date(entry.date) >= new Date());
  $("#nextAppointment").textContent = appointment ? formatDateTime(appointment.date) : "--";

  const today = todayKey();
  const poopToday = profile.poop.filter((item) => item.time.startsWith(today)).length;
  const peeToday = profile.pee.filter((item) => item.time.startsWith(today)).length;
  $("#poopToday").textContent = poopToday;
  $("#peeToday").textContent = peeToday;
  $("#poopCounter").textContent = poopToday;
  $("#peeCounter").textContent = peeToday;
  $("#saveStatus").textContent = formatSaveTime(state.data.settings.lastSavedAt);
};

const renderFeedings = (profile) => {
  renderList(
    "#feedingList",
    [...profile.feedings].sort((a, b) => new Date(b.time) - new Date(a.time)),
    (item) => `
      <article class="list-item">
        <div><strong>${safe(item.type)}</strong><span>${formatDateTime(item.time)} · ${safe(item.amount || "sem ml")} ml</span><span>Próxima: ${formatDateTime(item.nextAt)}</span></div>
        <button type="button" onclick="removeRecord('feedings','${item.id}')">Remover</button>
      </article>`
  );
};

const renderMilk = (profile) => {
  renderList(
    "#milkList",
    [...profile.milk].sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt)),
    (item) => {
      const expired = new Date(item.expiresAt) <= new Date();
      return `
        <article class="list-item ${expired ? "danger" : ""}">
          <div><strong>${safe(item.label)}</strong><span>${safe(item.amount)} ml · preparado ${formatDateTime(item.preparedAt)}</span><span>${expired ? "Vencido" : `Vence em ${formatCountdown(item.expiresAt)}`}</span></div>
          <button type="button" onclick="removeRecord('milk','${item.id}')">Remover</button>
        </article>`;
    }
  );
};

const renderDiapers = (profile) => {
  renderList(
    "#poopList",
    [...profile.poop].sort((a, b) => new Date(b.time) - new Date(a.time)),
    (item) => `<article class="list-item"><div><strong>${safe(item.texture)}</strong><span>${formatDateTime(item.time)}</span></div><button type="button" onclick="removeRecord('poop','${item.id}')">Remover</button></article>`
  );
  renderList(
    "#peeList",
    [...profile.pee].sort((a, b) => new Date(b.time) - new Date(a.time)),
    (item) => `<article class="list-item"><div><strong>${safe(item.volume)}</strong><span>${formatDateTime(item.time)}</span></div><button type="button" onclick="removeRecord('pee','${item.id}')">Remover</button></article>`
  );
};

const renderMedicines = (profile) => {
  renderList(
    "#medicineList",
    profile.medicines,
    (item) => {
      const nextAt = nextMedicineTime(item);
      return `
        <article class="list-item">
          <div><strong>${safe(item.name)}</strong><span>${safe(item.dose)} · a cada ${safe(item.intervalHours)}h</span><span>Próxima dose: ${formatCountdown(nextAt)} (${formatDateTime(nextAt)})</span></div>
          <button type="button" onclick="removeRecord('medicines','${item.id}')">Remover</button>
        </article>`;
    }
  );
};

const renderAppointments = (profile) => {
  renderList(
    "#appointmentList",
    [...profile.appointments].sort((a, b) => new Date(a.time) - new Date(b.time)),
    (item) => `
      <article class="list-item">
        <div><strong>${safe(item.title)}</strong><span>${formatDateTime(item.time)} · ${safe(item.place || "sem local")}</span><span>${safe(item.notes || "")}</span></div>
        <button type="button" onclick="removeRecord('appointments','${item.id}')">Remover</button>
      </article>`
  );
};

const drawGrowthChart = (profile) => {
  const canvas = $("#growthChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fffaf7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const points = [...profile.growth].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (points.length === 0) {
    ctx.fillStyle = "#8b6f75";
    ctx.font = "24px system-ui";
    ctx.fillText("Adicione medidas para ver o gráfico.", 120, 135);
    return;
  }

  const padding = 42;
  const width = canvas.width - padding * 2;
  const height = canvas.height - padding * 2;
  const weights = points.map((point) => Number(point.weight));
  const heights = points.map((point) => Number(point.height));
  const maxWeight = Math.max(...weights, 1);
  const maxHeight = Math.max(...heights, 1);

  ctx.strokeStyle = "#ead6d8";
  ctx.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const y = padding + (height / 4) * index;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  const drawLine = (values, max, color) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = padding + (points.length === 1 ? width / 2 : (width / (points.length - 1)) * index);
      const y = padding + height - (Number(value) / max) * height;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    values.forEach((value, index) => {
      const x = padding + (points.length === 1 ? width / 2 : (width / (points.length - 1)) * index);
      const y = padding + height - (Number(value) / max) * height;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  drawLine(weights, maxWeight, "#e77d8a");
  drawLine(heights, maxHeight, "#58a8a1");
  ctx.fillStyle = "#5f4b50";
  ctx.font = "18px system-ui";
  ctx.fillText("Peso", padding, 24);
  ctx.fillStyle = "#58a8a1";
  ctx.fillText("Tamanho", padding + 70, 24);
};

const renderProfile = (profile) => {
  $("#profileName").value = profile.name || "";
  $("#profileBirth").value = profile.birthDate || "";
  $("#profileWeight").value = profile.weight || "";
  $("#profileHeight").value = profile.height || "";

  $("#profileSelector").innerHTML = state.data.profiles
    .map((item) => `<option value="${safe(item.id)}" ${item.id === state.data.activeProfileId ? "selected" : ""}>${safe(item.name || "Meu Bebê")}</option>`)
    .join("");
  drawGrowthChart(profile);
};

const render = () => {
  const profile = activeProfile();
  renderHome(profile);
  renderFeedings(profile);
  renderMilk(profile);
  renderDiapers(profile);
  renderMedicines(profile);
  renderAppointments(profile);
  renderProfile(profile);
  setDefaultDateTimes();
};

const saveProfile = (updater, message) => {
  BabyStorage.updateActiveProfile(state.data, updater);
  render();
  toast(message);
};

const setupNavigation = () => {
  $$(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.screen = button.dataset.target;
      $$(".nav-btn").forEach((node) => node.classList.toggle("active", node === button));
      $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === state.screen));
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
};

const setupForms = () => {
  $("#feedingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const time = $("#feedingTime").value;
    const interval = Number($("#feedingInterval").value);
    saveProfile((profile) => {
      profile.feedings.push({
        id: makeId(),
        time,
        type: $("#feedingType").value,
        amount: $("#feedingAmount").value,
        intervalHours: interval,
        nextAt: new Date(new Date(time).getTime() + interval * 3600000).toISOString()
      });
    }, "Mamada salva.");
    event.target.reset();
    setDefaultDateTimes();
  });

  $("#milkForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const preparedAt = $("#milkPrepared").value;
    const hours = Number($("#milkHours").value);
    saveProfile((profile) => {
      profile.milk.push({
        id: makeId(),
        label: $("#milkLabel").value,
        amount: $("#milkAmount").value,
        preparedAt,
        hours,
        expiresAt: new Date(new Date(preparedAt).getTime() + hours * 3600000).toISOString()
      });
    }, "Leite salvo.");
    event.target.reset();
    setDefaultDateTimes();
  });

  $("#poopForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfile((profile) => {
      profile.poop.push({ id: makeId(), texture: $("#poopTexture").value, time: new Date().toISOString() });
    }, "Cocô registrado.");
  });

  $("#peeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfile((profile) => {
      profile.pee.push({ id: makeId(), volume: $("#peeVolume").value, time: new Date().toISOString() });
    }, "Xixi registrado.");
  });

  $("#medicineForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfile((profile) => {
      profile.medicines.push({
        id: makeId(),
        name: $("#medicineName").value,
        dose: $("#medicineDose").value,
        startAt: $("#medicineStart").value,
        intervalHours: Number($("#medicineInterval").value)
      });
    }, "Remédio salvo.");
    event.target.reset();
    setDefaultDateTimes();
  });

  $("#appointmentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfile((profile) => {
      profile.appointments.push({
        id: makeId(),
        title: $("#appointmentTitle").value,
        time: $("#appointmentTime").value,
        place: $("#appointmentPlace").value,
        notes: $("#appointmentNotes").value
      });
    }, "Consulta salva.");
    event.target.reset();
    setDefaultDateTimes();
  });

  $("#profileForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfile((profile) => {
      profile.name = $("#profileName").value.trim() || "Meu Bebê";
      profile.birthDate = $("#profileBirth").value;
      profile.weight = $("#profileWeight").value;
      profile.height = $("#profileHeight").value;
    }, "Perfil salvo.");
  });

  $("#growthForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveProfile((profile) => {
      const entry = {
        id: makeId(),
        date: $("#growthDate").value,
        weight: $("#growthWeight").value,
        height: $("#growthHeight").value
      };
      profile.growth.push(entry);
      profile.weight = entry.weight;
      profile.height = entry.height;
    }, "Crescimento adicionado.");
    event.target.reset();
    setDefaultDateTimes();
  });
};

const setupTools = () => {
  $("#profileSelector").addEventListener("change", (event) => {
    state.data.activeProfileId = event.target.value;
    BabyStorage.save(state.data);
    render();
    toast("Perfil alterado.");
  });

  $("#newProfileBtn").addEventListener("click", () => {
    const profile = BabyStorage.createProfile(`Bebê ${state.data.profiles.length + 1}`);
    state.data.profiles.push(profile);
    state.data.activeProfileId = profile.id;
    BabyStorage.save(state.data);
    render();
    toast("Novo perfil criado.");
  });

  ["#backupBtn", "#quickBackupBtn"].forEach((selector) => {
    $(selector).addEventListener("click", () => BabyStorage.exportData(state.data));
  });

  $("#restoreInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm("Restaurar este backup vai substituir os dados atuais deste navegador. Deseja continuar?")) {
      event.target.value = "";
      return;
    }
    try {
      state.data = await BabyStorage.importData(file);
      render();
      toast("Backup restaurado.");
    } catch (error) {
      console.error(error);
      toast("Não foi possível restaurar este arquivo.");
    } finally {
      event.target.value = "";
    }
  });
};

const setupPwa = () => {
  let deferredInstall = null;
  const installButton = $("#installBtn");

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((error) => {
      console.warn("Service worker indisponível.", error);
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstall = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    installButton.hidden = true;
  });
};

window.removeRecord = removeRecord;

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupForms();
  setupTools();
  setupPwa();
  render();
  setInterval(render, 60000);
});
