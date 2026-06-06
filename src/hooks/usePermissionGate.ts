import { useCallback } from "react";
import { useAuth } from "@clerk/clerk-expo";
import {
  completeAudioPrimer,
  completePhotosPrimer,
  completeSavePrimer,
  ensureAudioAccess,
  ensurePhotosAccess,
  ensureSaveAccess,
  getPrimerAckStatus,
  setPrimerDeferred,
  type PermissionGateResult,
  type PermissionPrimerId,
  type PrimerAckStatus,
} from "@/lib/permissions";
import { useLocalSession } from "@/providers/localSession";

type GateOptions = {
  clerkUserId?: string | null;
  localGuest?: boolean;
};

export function usePermissionGate(primerId: PermissionPrimerId) {
  const { userId } = useAuth();
  const { isLocalGuest } = useLocalSession();

  const resolveOptions = useCallback(
    (override?: GateOptions): GateOptions => ({
      clerkUserId: override?.clerkUserId ?? userId,
      localGuest: override?.localGuest ?? isLocalGuest,
    }),
    [userId, isLocalGuest],
  );

  const getAckStatus = useCallback(
    async (override?: GateOptions): Promise<PrimerAckStatus> => {
      const opts = resolveOptions(override);
      return getPrimerAckStatus(primerId, opts.clerkUserId, {
        localGuest: opts.localGuest,
      });
    },
    [primerId, resolveOptions],
  );

  const deferPrimer = useCallback(
    async (override?: GateOptions): Promise<boolean> => {
      const opts = resolveOptions(override);
      return setPrimerDeferred(primerId, opts.clerkUserId, {
        localGuest: opts.localGuest,
      });
    },
    [primerId, resolveOptions],
  );

  const ensureAccess = useCallback(
    async (override?: GateOptions): Promise<PermissionGateResult> => {
      const opts = resolveOptions(override);
      const gateOpts = { localGuest: opts.localGuest };

      switch (primerId) {
        case "perm-photos":
          return ensurePhotosAccess(opts.clerkUserId, gateOpts);
        case "perm-save":
          return ensureSaveAccess(opts.clerkUserId, gateOpts);
        case "perm-audio":
          return ensureAudioAccess(opts.clerkUserId, gateOpts);
        default:
          return { ok: false, status: "needs_primer", primerId };
      }
    },
    [primerId, resolveOptions],
  );

  const completePrimer = useCallback(
    async (override?: GateOptions): Promise<"granted" | "denied" | "n/a"> => {
      const opts = resolveOptions(override);
      const gateOpts = { localGuest: opts.localGuest };

      switch (primerId) {
        case "perm-photos":
          return completePhotosPrimer(opts.clerkUserId, gateOpts);
        case "perm-save":
          return completeSavePrimer(opts.clerkUserId, gateOpts);
        case "perm-audio":
          return completeAudioPrimer(opts.clerkUserId, gateOpts);
        default:
          return "n/a";
      }
    },
    [primerId, resolveOptions],
  );

  return {
    primerId,
    getAckStatus,
    deferPrimer,
    ensureAccess,
    completePrimer,
  };
}
