import { Check, Clock, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isMissingMigration } from "@/lib/db";
import { useLeaveWaitlist, useRegisterForOpportunity, useWaitlistPosition } from "@/hooks/useWaitlist";

export interface WaitlistButtonProps {
  opportunityId: string;
  isRegistered: boolean;
  isFull: boolean;
  onChange?: (status: "registered" | "waitlisted" | "left") => void;
  className?: string;
}

export function WaitlistButton({ opportunityId, isRegistered, isFull, onChange, className }: WaitlistButtonProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const register = useRegisterForOpportunity();
  const leave = useLeaveWaitlist();
  const position = useWaitlistPosition(isRegistered ? undefined : opportunityId);
  const onWaitlist = typeof position.data === "number";

  const fail = (e: unknown) => {
    const missing = isMissingMigration(e);
    toast({
      title: missing ? "Not available yet" : "Something went wrong",
      description: missing ? "Registration with waitlist is not enabled yet." : (e as Error).message,
      variant: "destructive",
    });
  };

  const join = () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to register.", variant: "destructive" });
      return;
    }
    register.mutate(opportunityId, {
      onSuccess: (r) => {
        if (r.status === "registered") {
          toast({ title: "You are registered" });
        } else {
          toast({
            title: "Added to waitlist",
            description: r.position ? `You are #${r.position} in line.` : undefined,
          });
        }
        onChange?.(r.status);
      },
      onError: fail,
    });
  };

  const leaveList = () =>
    leave.mutate(opportunityId, {
      onSuccess: () => {
        toast({ title: "Left the waitlist" });
        onChange?.("left");
      },
      onError: fail,
    });

  if (isRegistered) {
    return (
      <Button variant="secondary" disabled className={className}>
        <Check className="mr-2 h-4 w-4" aria-hidden="true" /> Registered
      </Button>
    );
  }

  if (onWaitlist) {
    return (
      <Button variant="outline" onClick={leaveList} disabled={leave.isPending} className={className}>
        {leave.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Clock className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        Leave waitlist (#{position.data})
      </Button>
    );
  }

  return (
    <Button onClick={join} disabled={register.isPending} className={className}>
      {register.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {isFull ? "Join waitlist" : "Join"}
    </Button>
  );
}

export default WaitlistButton;
