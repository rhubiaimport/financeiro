(function () {
  const STORAGE_KEY = "meu-bebe:v1";
  const RECOVERY_KEY = "meu-bebe:v1:recovery";

  const createProfile = (name = "Meu Bebê") => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    birthDate: "",
    weight: "",
    height: "",
    feedings: [],
    milk: [],
    poop: [],
    pee: [],
    medicines: [],
    appointments: [],
    growth: []
  });

  const defaultData = () => {
    const profile = createProfile();
    return {
      version: 1,
      activeProfileId: profile.id,
      profiles: [profile],
      settings: {
        cloudReady: false,
        loginReady: false,
        lastSavedAt: ""
      }
    };
  };

  const normalizeData = (data) => {
    if (!data || !Array.isArray(data.profiles) || data.profiles.length === 0) {
      return defaultData();
    }

    data.version = 1;
    data.settings = {
      cloudReady: false,
      loginReady: false,
      lastSavedAt: "",
      ...data.settings
    };
    data.profiles = data.profiles.map((profile) => ({
      ...createProfile(profile.name || "Meu Bebê"),
      ...profile,
      feedings: Array.isArray(profile.feedings) ? profile.feedings : [],
      milk: Array.isArray(profile.milk) ? profile.milk : [],
      poop: Array.isArray(profile.poop) ? profile.poop : [],
      pee: Array.isArray(profile.pee) ? profile.pee : [],
      medicines: Array.isArray(profile.medicines) ? profile.medicines : [],
      appointments: Array.isArray(profile.appointments) ? profile.appointments : [],
      growth: Array.isArray(profile.growth) ? profile.growth : []
    }));

    if (!data.activeProfileId || !data.profiles.some((profile) => profile.id === data.activeProfileId)) {
      data.activeProfileId = data.profiles[0].id;
    }

    return data;
  };

  const load = () => {
    try {
      return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch (error) {
      console.warn("Dados principais corrompidos. Tentando recuperar backup interno.", error);
      try {
        return normalizeData(JSON.parse(localStorage.getItem(RECOVERY_KEY)));
      } catch (recoveryError) {
        console.warn("Backup interno indisponível. Dados reiniciados.", recoveryError);
        return defaultData();
      }
    }
  };

  const save = (data) => {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) localStorage.setItem(RECOVERY_KEY, current);
    data.settings = data.settings || {};
    data.settings.lastSavedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
  };

  const getActiveProfile = (data) => data.profiles.find((profile) => profile.id === data.activeProfileId);

  const updateActiveProfile = (data, updater) => {
    const profile = getActiveProfile(data);
    updater(profile);
    save(data);
    return profile;
  };

  const exportData = (data) => {
    const blob = new Blob([JSON.stringify(normalizeData(data), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `meu-bebe-backup-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file) => {
    const text = await file.text();
    const imported = normalizeData(JSON.parse(text));
    save(imported);
    return imported;
  };

  window.BabyStorage = {
    createProfile,
    load,
    save,
    getActiveProfile,
    updateActiveProfile,
    exportData,
    importData
  };
})();
