/** Dev preview route for PRD-00 design system primitives (light + dark). */
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { useTheme } from "../context/ThemeContext";

function PrimitiveSection({ title, children }) {
  return (
    <section className="space-y-3 rounded-lg border border-border-1 bg-surface-0 p-4">
      <h2 className="text-heading-2 text-text-1">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

export default function DesignSystemPreview() {
  const { theme, cycleTheme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <div className="min-h-screen bg-surface-1 p-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-label text-text-3">PRD-00</p>
            <h1 className="text-display-md text-text-1">Design System Preview</h1>
          </div>
          <Button variant="secondary" onClick={cycleTheme}>
            Cycle theme ({theme}{isDark ? ", dark" : ", light"})
          </Button>
        </header>

        <PrimitiveSection title="Typography">
          <p className="text-display-lg text-text-1">Display LG</p>
          <p className="text-heading-1 text-text-1">Heading 1</p>
          <p className="text-body text-text-2">Body — 13px Inter at 1.45 line-height.</p>
          <p className="text-mono text-text-3">mono — JetBrains Mono 12px</p>
        </PrimitiveSection>

        <PrimitiveSection title="Buttons">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </PrimitiveSection>

        <PrimitiveSection title="Inputs">
          <Input placeholder="Placeholder text" className="max-w-xs" />
          <Select defaultValue="applied">
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
            </SelectContent>
          </Select>
          <Checkbox aria-label="Sample checkbox" />
        </PrimitiveSection>

        <PrimitiveSection title="Badges">
          <Badge variant="dot">To Apply</Badge>
          <Badge variant="soft">Soft</Badge>
          <Badge variant="solid">Solid</Badge>
          <Badge variant="info">Applied</Badge>
          <Badge variant="success">Offer</Badge>
        </PrimitiveSection>

        <PrimitiveSection title="Overlays">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modal title</DialogTitle>
                <DialogDescription>
                  12px radius, modal shadow, Cardinal focus rings.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Hover tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Tooltip label — 11px</TooltipContent>
          </Tooltip>
        </PrimitiveSection>

        <PrimitiveSection title="Status dots">
          {[
            ["neutral", "To Apply"],
            ["info", "Applied"],
            ["violet", "Phone Screen"],
            ["warn", "Technical"],
            ["orange", "Onsite"],
            ["success", "Offer"],
          ].map(([token, label]) => (
            <span key={token} className="inline-flex items-center gap-1.5 text-body-sm text-text-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `var(--status-${token})` }}
              />
              {label}
            </span>
          ))}
        </PrimitiveSection>
      </div>
    </div>
  );
}
