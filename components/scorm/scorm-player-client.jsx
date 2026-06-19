"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Loader2, AlertCircle, CheckCircle2, BookOpen } from "lucide-react";
import Box from "@/components/ui/box";
import Text from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const STATUS_CFG = {
  "not attempted": { label: "Not Started",  cls: "bg-gray-100 text-gray-500 border-0"          },
  incomplete:      { label: "In Progress",  cls: "bg-blue-100 text-blue-600 border-0"           },
  completed:       { label: "Completed",    cls: "bg-emerald-100 text-emerald-700 border-0"     },
  passed:          { label: "Passed",       cls: "bg-emerald-100 text-emerald-700 border-0"     },
  failed:          { label: "Failed",       cls: "bg-red-100 text-red-600 border-0"             },
};

export function ScormPlayerClient({ packageId }) {
  const { token } = useAuth();
  const router = useRouter();
  const apiRef  = useRef(null);
  const saveRef = useRef(null); // debounced save fn

  const [pkg,      setPkg]      = useState(null);
  const [tracking, setTracking] = useState(null);
  const [status,   setStatus]   = useState("loading"); // loading | ready | error
  const [saveMsg,  setSaveMsg]  = useState("");

  /* ── Persist CMI data to server ── */
  const persistTracking = useCallback(async (api) => {
    if (!token || !api) return;
    try {
      const cmiData = JSON.parse(JSON.stringify(api.cmi ?? {}));
      await fetch(`/api/learner/scorm/${packageId}/tracking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cmi_data: cmiData }),
      });
      setSaveMsg("saved");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch {
      setSaveMsg("save failed");
    }
  }, [token, packageId]);

  /* ── Bootstrap: fetch metadata + tracking, init scorm-again ── */
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    Promise.all([
      fetch(`/api/learner/scorm/${packageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch(`/api/learner/scorm/${packageId}/tracking`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()).catch(() => ({ tracking: null })),
    ])
      .then(async ([pkgData, trackingData]) => {
        if (cancelled) return;
        if (!pkgData?.package) { setStatus("error"); return; }

        setPkg(pkgData.package);
        setTracking(trackingData.tracking);

        /* Dynamically import scorm-again (browser only) */
        const { Scorm12API, Scorm2004API } = await import("scorm-again");
        if (cancelled) return;

        const is2004  = pkgData.package.version === "2004";
        const APIClass = is2004 ? Scorm2004API : Scorm12API;

        const api = new APIClass({ autocommit: false, logLevel: 4 });

        /* Restore saved data */
        const savedCmi = trackingData.tracking?.cmi_data;
        if (savedCmi) {
          try {
            const parsed = typeof savedCmi === "string" ? JSON.parse(savedCmi) : savedCmi;
            api.loadFromJSON(parsed, "");
          } catch { /* ignore corrupt data */ }
        }

        /* Save on commit / finish */
        const save = () => persistTracking(api);
        saveRef.current = save;

        if (is2004) {
          api.on("Commit",    save);
          api.on("Terminate", save);
        } else {
          api.on("LMSCommit", save);
          api.on("LMSFinish", save);
        }

        /* Expose on window so iframe content can call window.parent.API */
        if (is2004) window.API_1484_11 = api;
        else        window.API          = api;

        apiRef.current = api;
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });

    return () => {
      cancelled = true;
      /* Save on unmount */
      if (apiRef.current && saveRef.current) saveRef.current();
      delete window.API;
      delete window.API_1484_11;
    };
  }, [token, packageId, persistTracking]);

  /* ── Exit handler: save then navigate back ── */
  const handleExit = async () => {
    if (apiRef.current && saveRef.current) await saveRef.current();
    router.back();
  };

  /* ── Loading ── */
  if (status === "loading") {
    return (
      <Box className="flex h-screen items-center justify-center bg-background gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <Text as="span" className="text-sm text-muted-foreground">Loading SCORM content…</Text>
      </Box>
    );
  }

  /* ── Error ── */
  if (status === "error") {
    return (
      <Box className="flex h-screen flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <Text as="h2" className="text-base font-semibold">Failed to load SCORM package</Text>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </Box>
    );
  }

  const currentStatus = tracking?.lesson_status ?? tracking?.completion_status ?? "not attempted";
  const statusCfg     = STATUS_CFG[currentStatus] ?? STATUS_CFG["not attempted"];
  const iframeSrc     = `/scorm/${pkg.package_dir}/${pkg.entry_point}`;

  return (
    <Box className="flex flex-col h-screen bg-background overflow-hidden">

      {/* ── Top bar ── */}
      <Box className="flex items-center justify-between px-4 h-12 border-b bg-card shrink-0 gap-3">
        <Box className="flex items-center gap-2.5 min-w-0">
          <BookOpen className="h-4 w-4 text-indigo-500 shrink-0" />
          <Text as="span" className="text-sm font-semibold truncate">{pkg.title}</Text>
          <Badge className={cn("text-[11px] hidden sm:flex", statusCfg.cls)}>{statusCfg.label}</Badge>
          <Badge className="text-[11px] border-0 bg-indigo-50 text-indigo-600 hidden md:flex">
            SCORM {pkg.version}
          </Badge>
        </Box>

        <Box className="flex items-center gap-3 shrink-0">
          {saveMsg === "saved" && (
            <Box className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <Text as="span" className="text-xs">Saved</Text>
            </Box>
          )}
          {saveMsg === "save failed" && (
            <Text as="span" className="text-xs text-red-500">Save failed</Text>
          )}
          <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={handleExit}>
            <X className="h-4 w-4" />
            <Text as="span" className="hidden sm:inline">Exit</Text>
          </Button>
        </Box>
      </Box>

      {/* ── SCORM iframe ── */}
      <iframe
        src={iframeSrc}
        title={pkg.title}
        className="flex-1 w-full border-0"
        allow="fullscreen"
      />
    </Box>
  );
}
