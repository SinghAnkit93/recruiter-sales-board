import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PRIORITIES, STAGES, stageLabel } from "@/lib/pipeline";
import { useCreateDeal } from "@/lib/deals-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PriorityPill } from "./bits";

export function NewDealDialog({
  stage,
  ownerId,
  onClose,
  onCreated,
}: {
  stage: string | null;
  ownerId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const create = useCreateDeal();
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [contact, setContact] = useState("");
  const [value, setValue] = useState("");
  const [priority, setPriority] = useState("medium");
  const [stageId, setStageId] = useState(stage ?? "lead");

  useEffect(() => {
    if (stage) {
      setCompany("");
      setTitle("");
      setContact("");
      setValue("");
      setPriority("medium");
      setStageId(stage);
    }
  }, [stage]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate(
      {
        company: company.trim(),
        title: title.trim(),
        contact_name: contact.trim(),
        value: Math.max(0, Number(value) || 0),
        priority,
        stage: stageId,
        owner_id: ownerId,
      },
      {
        onSuccess: (deal) => {
          toast.success(`${deal.company} added to ${stageLabel(deal.stage)}`);
          onCreated(deal.id);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't add deal"),
      },
    );
  }

  return (
    <Dialog open={stage !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New deal</DialogTitle>
          <DialogDescription>
            Add the basics now — fill in the rest from the side panel.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="nd-company">Company *</Label>
            <Input
              id="nd-company"
              required
              autoFocus
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Nimbus Fintech"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nd-title">What are they hiring for?</Label>
            <Input
              id="nd-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 4 backend engineers"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="nd-contact">Contact person</Label>
              <Input
                id="nd-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nd-value">Est. fee (₹)</Label>
              <Input
                id="nd-value"
                type="number"
                min={0}
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="500000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Stage</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <PriorityPill priority={p.id} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!company.trim() || create.isPending}>
              Add deal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
