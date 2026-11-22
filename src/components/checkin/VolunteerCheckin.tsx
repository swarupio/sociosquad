import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVolunteerCheckin, type CheckinError } from "@/hooks/useCheckin";
import { formatCode, parseCheckinInput } from "@/lib/checkin";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

function getDetectorCtor(): BarcodeDetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

interface VolunteerCheckinProps {
  /** Pre-filled code (e.g. from the URL); submitted automatically when autoSubmit is true. */
  initialCode?: string;
  autoSubmit?: boolean;
}

export function VolunteerCheckin({ initialCode, autoSubmit = false }: VolunteerCheckinProps) {
  const [value, setValue] = useState(initialCode ? formatCode(initialCode) : "");
  const [inputError, setInputError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoRan = useRef(false);
  const { mutate, isPending, isSuccess, data, error, reset } = useVolunteerCheckin();

  const canScan = typeof window !== "undefined" && !!getDetectorCtor() && !!navigator.mediaDevices?.getUserMedia;

  const submit = useCallback(
    (text: string) => {
      const code = parseCheckinInput(text);
      if (!code) {
        setInputError("Enter the 8-character code shown at the event.");
        return;
      }
      setInputError(null);
      setValue(formatCode(code));
      mutate(code);
    },
    [mutate],
  );

  useEffect(() => {
    if (autoSubmit && initialCode && !autoRan.current) {
      autoRan.current = true;
      submit(initialCode);
    }
  }, [autoSubmit, initialCode, submit]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    let timer: number | undefined;
    const Ctor = getDetectorCtor();
    if (!Ctor) return;
    const detector = new Ctor({ formats: ["qr_code"] });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const loop = async () => {
          if (cancelled) return;
          try {
            const found = await detector.detect(video);
            for (const f of found) {
              if (parseCheckinInput(f.rawValue)) {
                stopCamera();
                submit(f.rawValue);
                return;
              }
            }
          } catch {
            /* transient detect failure; keep scanning */
          }
          timer = window.setTimeout(loop, 300);
        };
        void loop();
      } catch {
        setCameraError("Camera unavailable. Type the code instead.");
        stopCamera();
      }
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [scanning, stopCamera, submit]);

  const err = error as CheckinError | null;

  if (isSuccess && data) {
    return (
      <div className="space-y-3 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-semibold">{data.already ? "Already checked in" : "You're checked in!"}</h2>
        <p className="text-muted-foreground">
          {data.title}. Your hours will be added once the organizer verifies your attendance.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            reset();
            setValue("");
          }}
        >
          Check in to another event
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="checkin-code">Check-in code</Label>
        <Input
          id="checkin-code"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setInputError(null);
            if (error) reset();
          }}
          placeholder="XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="text-center font-mono text-xl tracking-widest"
          aria-invalid={!!inputError || !!err}
          aria-describedby="checkin-feedback"
        />
      </div>

      <div id="checkin-feedback" aria-live="polite">
        {inputError && <p className="text-sm text-destructive">{inputError}</p>}
        {err && (
          <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
            <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {err.kind === "not_enabled" ? "Check-in is not enabled yet." : err.message}
          </p>
        )}
        {cameraError && <p className="text-sm text-muted-foreground">{cameraError}</p>}
      </div>

      {scanning && (
        <div className="overflow-hidden rounded-lg border border-border">
          <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline aria-label="Camera preview" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending || !value.trim()}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Check in
        </Button>
        {canScan && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCameraError(null);
              if (scanning) stopCamera();
              else setScanning(true);
            }}
          >
            <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
            {scanning ? "Stop camera" : "Scan with camera"}
          </Button>
        )}
      </div>
    </form>
  );
}

export default VolunteerCheckin;
