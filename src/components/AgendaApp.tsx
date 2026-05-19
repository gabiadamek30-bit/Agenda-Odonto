import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Stethoscope,
  BookOpen,
  Briefcase,
  FileText,
  Users,
  ClipboardList,
  Package,
  Microscope,
  CalendarDays,
  Trash2,
  Plus,
  Pencil,
  FlaskConical,
  Home,
  Bell,
  BellRing,
} from "lucide-react";
import { useLocalStorage, uid } from "@/lib/storage";

type BaseItem = {
  id: string;
  title: string;
  date?: string;
  time?: string;
  notes?: string;
  done?: boolean;
  /** minutes before date+time to notify; "" or undefined = no reminder */
  reminder?: string;
};

type Clinica = BaseItem & { local?: string; paciente?: string; procedimento?: string };
type Materia = BaseItem & { professor?: string; horario?: string };
type Estagio = BaseItem & { local?: string; supervisor?: string };
type Prova = BaseItem & { materia?: string; conteudo?: string };
type Tbl = BaseItem & { materia?: string; tema?: string };
type Trabalho = BaseItem & { materia?: string; entrega?: string };
type Laboratorio = BaseItem & { local?: string; disciplina?: string; atividade?: string };
type Material = BaseItem & {
  quantidade?: string;
  categoria?: string;
  comprado?: boolean;
  clinicaIds?: string[];
  laboratorioIds?: string[];
};
type IcItem = BaseItem & { tipo?: string; orientador?: string };

const STORAGE_KEYS = {
  clinica: "agenda.clinica",
  materias: "agenda.materias",
  estagio: "agenda.estagio",
  provas: "agenda.provas",
  tbl: "agenda.tbl",
  trabalhos: "agenda.trabalhos",
  laboratorios: "agenda.laboratorios",
  materiais: "agenda.materiais",
  ic: "agenda.ic",
  notified: "agenda.notified",
};

const REMINDER_OPTIONS = [
  { value: "", label: "Sem lembrete" },
  { value: "0", label: "Na hora" },
  { value: "15", label: "15 min antes" },
  { value: "30", label: "30 min antes" },
  { value: "60", label: "1 hora antes" },
  { value: "120", label: "2 horas antes" },
  { value: "1440", label: "1 dia antes" },
  { value: "2880", label: "2 dias antes" },
];

function formatDate(d?: string) {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return d;
  }
}

function sortByDate<T extends BaseItem>(items: T[]) {
  return [...items].sort((a, b) => {
    const da = (a.date || "9999") + "T" + (a.time || "23:59");
    const db = (b.date || "9999") + "T" + (b.time || "23:59");
    return da.localeCompare(db);
  });
}

function itemDateTime(i: BaseItem): Date | null {
  if (!i.date) return null;
  return new Date(`${i.date}T${i.time || "09:00"}:00`);
}

type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "date" | "time" | "textarea" | "select" | "multiselect" | "reminder";
  options?: { value: string; label: string }[] | string[];
  placeholder?: string;
};

function normalizeOptions(opts?: FieldDef["options"]) {
  if (!opts) return [];
  return opts.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
}

function ItemDialog<T extends Record<string, any>>({
  open,
  onOpenChange,
  title,
  fields,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  fields: FieldDef[];
  value: T;
  onSave: (v: T) => void;
}) {
  const [draft, setDraft] = useState<T>(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [value, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {fields.map((f) => {
            const v = (draft as any)[f.key];
            if (f.type === "textarea") {
              return (
                <div key={f.key} className="grid gap-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Textarea
                    id={f.key}
                    value={v ?? ""}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                  />
                </div>
              );
            }
            if (f.type === "select" || f.type === "reminder") {
              const opts =
                f.type === "reminder" ? REMINDER_OPTIONS : normalizeOptions(f.options);
              return (
                <div key={f.key} className="grid gap-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Select
                    value={v ?? ""}
                    onValueChange={(val) => setDraft({ ...draft, [f.key]: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={f.placeholder || "Selecione"} />
                    </SelectTrigger>
                    <SelectContent>
                      {opts.map((o) => (
                        <SelectItem key={o.value || "_none"} value={o.value || "__none__"}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }
            if (f.type === "multiselect") {
              const opts = normalizeOptions(f.options);
              const selected: string[] = Array.isArray(v) ? v : [];
              return (
                <div key={f.key} className="grid gap-1.5">
                  <Label>{f.label}</Label>
                  {opts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhum item disponível ainda.
                    </p>
                  ) : (
                    <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-md border p-2">
                      {opts.map((o) => {
                        const checked = selected.includes(o.value);
                        return (
                          <label
                            key={o.value}
                            className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-pink-50"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => {
                                const next = c
                                  ? [...selected, o.value]
                                  : selected.filter((x) => x !== o.value);
                                setDraft({ ...draft, [f.key]: next });
                              }}
                            />
                            <span>{o.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div key={f.key} className="grid gap-1.5">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type={f.type || "text"}
                  value={v ?? ""}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                />
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (!(draft as any).title?.trim()) {
                toast.error("Adicione um título");
                return;
              }
              // normalize __none__ sentinel back to ""
              const cleaned: any = { ...draft };
              Object.keys(cleaned).forEach((k) => {
                if (cleaned[k] === "__none__") cleaned[k] = "";
              });
              onSave(cleaned);
              onOpenChange(false);
            }}
            className="bg-pink-600 hover:bg-pink-700"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section<T extends BaseItem>({
  title,
  description,
  icon: Icon,
  items,
  setItems,
  fields,
  renderMeta,
  showCheckbox = true,
  checkboxKey = "done",
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: T[];
  setItems: (v: T[]) => void;
  fields: FieldDef[];
  renderMeta: (item: T) => React.ReactNode;
  showCheckbox?: boolean;
  checkboxKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  const emptyDraft = useMemo(() => {
    const d: any = { id: uid(), title: "" };
    fields.forEach((f) => (d[f.key] = f.type === "multiselect" ? [] : ""));
    return d as T;
  }, [fields]);

  const sorted = sortByDate(items);

  return (
    <Card className="border-pink-100">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-pink-100 p-2 text-pink-700">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditing(emptyDraft);
            setOpen(true);
          }}
          className="bg-pink-600 hover:bg-pink-700"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-pink-200 bg-pink-50/40 py-10 text-center text-sm text-muted-foreground">
            Nada por aqui ainda. Toque em “Adicionar” para começar.
          </div>
        ) : (
          <ul className="grid gap-2">
            {sorted.map((item) => {
              const checked = (item as any)[checkboxKey];
              return (
                <li
                  key={item.id}
                  className={`group flex items-start gap-3 rounded-xl border bg-card p-3 transition ${
                    checked ? "border-pink-100 opacity-60" : "border-border hover:border-pink-200"
                  }`}
                >
                  {showCheckbox && (
                    <Checkbox
                      checked={!!checked}
                      onCheckedChange={(v) =>
                        setItems(
                          items.map((i) =>
                            i.id === item.id ? ({ ...i, [checkboxKey]: !!v } as T) : i,
                          ),
                        )
                      }
                      className="mt-1"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-medium ${checked ? "line-through" : ""}`}>
                        {item.title}
                      </span>
                      {item.date && (
                        <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                          <CalendarDays className="mr-1 h-3 w-3" />
                          {formatDate(item.date)}
                          {item.time ? ` · ${item.time}` : ""}
                        </Badge>
                      )}
                      {item.reminder && (
                        <Badge variant="outline" className="border-pink-300 text-pink-700">
                          <Bell className="mr-1 h-3 w-3" />
                          {REMINDER_OPTIONS.find((r) => r.value === item.reminder)?.label}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{renderMeta(item)}</div>
                    {item.notes && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-60 transition group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(item);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setItems(items.filter((i) => i.id !== item.id));
                        toast.success("Removido");
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
      {editing && (
        <ItemDialog
          open={open}
          onOpenChange={setOpen}
          title={title}
          fields={fields}
          value={editing}
          onSave={(v) => {
            const exists = items.find((i) => i.id === v.id);
            if (exists) {
              setItems(items.map((i) => (i.id === v.id ? v : i)));
              toast.success("Atualizado");
            } else {
              setItems([...items, v]);
              toast.success("Adicionado");
            }
          }}
        />
      )}
    </Card>
  );
}

const titleField: FieldDef = {
  key: "title",
  label: "Título",
  placeholder: "Ex.: Restauração canal 26",
};
const dateField: FieldDef = { key: "date", label: "Data", type: "date" };
const timeField: FieldDef = { key: "time", label: "Horário", type: "time" };
const reminderField: FieldDef = { key: "reminder", label: "Lembrete", type: "reminder" };
const notesField: FieldDef = { key: "notes", label: "Observações", type: "textarea" };

export default function AgendaApp() {
  const [clinica, setClinica] = useLocalStorage<Clinica[]>(STORAGE_KEYS.clinica, []);
  const [materias, setMaterias] = useLocalStorage<Materia[]>(STORAGE_KEYS.materias, []);
  const [estagio, setEstagio] = useLocalStorage<Estagio[]>(STORAGE_KEYS.estagio, []);
  const [provas, setProvas] = useLocalStorage<Prova[]>(STORAGE_KEYS.provas, []);
  const [tbl, setTbl] = useLocalStorage<Tbl[]>(STORAGE_KEYS.tbl, []);
  const [trabalhos, setTrabalhos] = useLocalStorage<Trabalho[]>(STORAGE_KEYS.trabalhos, []);
  const [laboratorios, setLaboratorios] = useLocalStorage<Laboratorio[]>(
    STORAGE_KEYS.laboratorios,
    [],
  );
  const [materiais, setMateriais] = useLocalStorage<Material[]>(STORAGE_KEYS.materiais, []);
  const [ic, setIc] = useLocalStorage<IcItem[]>(STORAGE_KEYS.ic, []);
  const [tab, setTab] = useState("inicio");

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "denied",
  );

  const allDated = useMemo(
    () => [
      ...clinica.map((i) => ({ kind: "Clínica", tab: "clinica", item: i as BaseItem })),
      ...estagio.map((i) => ({ kind: "Estágio", tab: "estagio", item: i as BaseItem })),
      ...provas.map((i) => ({ kind: "Prova", tab: "provas", item: i as BaseItem })),
      ...tbl.map((i) => ({ kind: "TBL", tab: "tbl", item: i as BaseItem })),
      ...trabalhos.map((i) => ({ kind: "Trabalho", tab: "trabalhos", item: i as BaseItem })),
      ...laboratorios.map((i) => ({ kind: "Laboratório", tab: "laboratorios", item: i as BaseItem })),
      ...ic.map((i) => ({ kind: "IC", tab: "ic", item: i as BaseItem })),
    ],
    [clinica, estagio, provas, tbl, trabalhos, laboratorios, ic],
  );

  const upcoming = useMemo(() => {
    const now = new Date();
    return allDated
      .filter((x) => {
        if (!x.item.date || x.item.done) return false;
        const dt = itemDateTime(x.item);
        return dt ? dt.getTime() >= now.getTime() - 12 * 60 * 60 * 1000 : false;
      })
      .sort(
        (a, b) =>
          (itemDateTime(a.item)?.getTime() ?? 0) - (itemDateTime(b.item)?.getTime() ?? 0),
      );
  }, [allDated]);

  // === Notifications loop ===
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    const tick = () => {
      const now = Date.now();
      let notified: string[] = [];
      try {
        notified = JSON.parse(localStorage.getItem(STORAGE_KEYS.notified) || "[]");
      } catch {}
      const fresh = new Set(notified);
      let changed = false;

      allDated.forEach(({ kind, item }) => {
        if (!item.date || !item.reminder || item.done) return;
        const dt = itemDateTime(item);
        if (!dt) return;
        const triggerAt = dt.getTime() - parseInt(item.reminder, 10) * 60 * 1000;
        if (now >= triggerAt && now <= dt.getTime() + 60 * 1000) {
          const key = `${item.id}:${item.date}:${item.time || ""}:${item.reminder}`;
          if (!fresh.has(key)) {
            fresh.add(key);
            changed = true;
            const body = `${formatDate(item.date)}${item.time ? " · " + item.time : ""}`;
            if (Notification.permission === "granted") {
              try {
                new Notification(`${kind}: ${item.title}`, {
                  body,
                  icon: "/favicon.ico",
                  tag: key,
                });
              } catch {}
            }
            toast(`${kind}: ${item.title}`, {
              description: body,
              icon: <BellRing className="h-4 w-4 text-pink-600" />,
            });
          }
        }
      });

      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.notified, JSON.stringify(Array.from(fresh)));
        } catch {}
      }
    };

    tick();
    const id = window.setInterval(tick, 30 * 1000);
    return () => window.clearInterval(id);
  }, [allDated]);

  const requestNotif = async () => {
    if (!("Notification" in window)) {
      toast.error("Este navegador não suporta notificações");
      return;
    }
    const p = await Notification.requestPermission();
    setNotifPermission(p);
    if (p === "granted") toast.success("Notificações ativadas 💗");
    else toast("Notificações não permitidas — você ainda verá alertas no app");
  };

  const clinicaOptions = useMemo(
    () =>
      sortByDate(clinica).map((c) => ({
        value: c.id,
        label: `${c.title}${c.date ? " · " + formatDate(c.date) : ""}`,
      })),
    [clinica],
  );
  const labOptions = useMemo(
    () =>
      sortByDate(laboratorios).map((l) => ({
        value: l.id,
        label: `${l.title}${l.date ? " · " + formatDate(l.date) : ""}`,
      })),
    [laboratorios],
  );

  const counts = {
    clinica: clinica.length,
    materias: materias.length,
    estagio: estagio.length,
    provas: provas.length,
    tbl: tbl.length,
    trabalhos: trabalhos.length,
    laboratorios: laboratorios.length,
    materiais: materiais.filter((m) => !m.comprado).length,
    ic: ic.length,
  };

  const quickTabs: Array<{
    key: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
  }> = [
    { key: "clinica", label: "Clínica", icon: Stethoscope, count: counts.clinica },
    { key: "laboratorios", label: "Laboratórios", icon: FlaskConical, count: counts.laboratorios },
    { key: "materias", label: "Matérias", icon: BookOpen, count: counts.materias },
    { key: "estagio", label: "Estágio", icon: Briefcase, count: counts.estagio },
    { key: "provas", label: "Provas", icon: FileText, count: counts.provas },
    { key: "tbl", label: "TBL", icon: Users, count: counts.tbl },
    { key: "trabalhos", label: "Trabalhos", icon: ClipboardList, count: counts.trabalhos },
    { key: "materiais", label: "Materiais", icon: Package, count: counts.materiais },
    { key: "ic", label: "IC", icon: Microscope, count: counts.ic },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white">
      <Toaster richColors position="top-center" />
      <header className="border-b border-pink-100/80 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-pink-600 p-2 text-white shadow-sm">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Agenda Odonto</h1>
              <p className="text-sm text-muted-foreground">
                Tudo da faculdade num só lugar.
              </p>
            </div>
          </div>
          {notifPermission !== "granted" && (
            <Button
              variant="outline"
              size="sm"
              onClick={requestNotif}
              className="border-pink-300 text-pink-700 hover:bg-pink-50"
            >
              <Bell className="mr-1 h-4 w-4" /> Ativar lembretes
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-pink-100/60 p-1">
            <TabsTrigger value="inicio" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
              <Home className="mr-1 h-4 w-4" />Início
            </TabsTrigger>
            <TabsTrigger value="clinica"><Stethoscope className="mr-1 h-4 w-4" />Clínica</TabsTrigger>
            <TabsTrigger value="laboratorios"><FlaskConical className="mr-1 h-4 w-4" />Laboratórios</TabsTrigger>
            <TabsTrigger value="materias"><BookOpen className="mr-1 h-4 w-4" />Matérias</TabsTrigger>
            <TabsTrigger value="estagio"><Briefcase className="mr-1 h-4 w-4" />Estágio</TabsTrigger>
            <TabsTrigger value="provas"><FileText className="mr-1 h-4 w-4" />Provas</TabsTrigger>
            <TabsTrigger value="tbl"><Users className="mr-1 h-4 w-4" />TBL</TabsTrigger>
            <TabsTrigger value="trabalhos"><ClipboardList className="mr-1 h-4 w-4" />Trabalhos</TabsTrigger>
            <TabsTrigger value="materiais"><Package className="mr-1 h-4 w-4" />Materiais</TabsTrigger>
            <TabsTrigger value="ic" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
              <Microscope className="mr-1 h-4 w-4" />IC
            </TabsTrigger>
          </TabsList>

          {/* ============= INÍCIO ============= */}
          <TabsContent value="inicio" className="mt-4 space-y-4">
            <Card className="border-pink-200 bg-gradient-to-r from-pink-100 to-rose-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pink-800">
                  <CalendarDays className="h-5 w-5" /> Próximos compromissos
                </CardTitle>
                <p className="text-sm text-pink-900/70">
                  Tudo da sua agenda em ordem cronológica.
                </p>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-pink-200 bg-white/60 py-8 text-center text-sm text-muted-foreground">
                    Sem compromissos próximos. Aproveita pra descansar 💗
                  </div>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {upcoming.slice(0, 10).map(({ kind, tab: t, item }) => (
                      <li
                        key={item.id + kind}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-pink-100 bg-white px-3 py-2 transition hover:border-pink-300"
                        onClick={() => setTab(t)}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{item.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(item.date)}
                            {item.time ? ` · ${item.time}` : ""}
                          </div>
                        </div>
                        <Badge className="bg-pink-600 hover:bg-pink-600">{kind}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-pink-100">
              <CardHeader>
                <CardTitle className="text-base">Acesso rápido</CardTitle>
                <p className="text-sm text-muted-foreground">Entre direto na área que quiser.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {quickTabs.map(({ key, label, icon: Icon, count }) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className="group flex flex-col items-start gap-2 rounded-xl border border-pink-100 bg-white p-3 text-left transition hover:border-pink-300 hover:bg-pink-50"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="rounded-lg bg-pink-100 p-2 text-pink-700 transition group-hover:bg-pink-600 group-hover:text-white">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-semibold text-pink-700">{count}</span>
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {materiais.filter((m) => !m.comprado).length > 0 && (
              <Card className="border-pink-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5 text-pink-600" /> Materiais pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-1.5 text-sm">
                    {materiais
                      .filter((m) => !m.comprado)
                      .slice(0, 6)
                      .map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between rounded-md border border-pink-100 bg-pink-50/40 px-3 py-1.5"
                        >
                          <span>{m.title}</span>
                          {m.quantidade && (
                            <span className="text-xs text-muted-foreground">{m.quantidade}</span>
                          )}
                        </li>
                      ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============= CLÍNICA ============= */}
          <TabsContent value="clinica" className="mt-4">
            <Section<Clinica>
              title="Dias de Clínica"
              description="Agende seus atendimentos, pacientes e procedimentos."
              icon={Stethoscope}
              items={clinica}
              setItems={setClinica}
              fields={[
                titleField,
                dateField,
                timeField,
                reminderField,
                { key: "local", label: "Clínica / Sala", placeholder: "Clínica 2 — Box 4" },
                { key: "paciente", label: "Paciente" },
                { key: "procedimento", label: "Procedimento", placeholder: "Ex.: Restauração, Endo, Profilaxia" },
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.local && <span>{i.local}</span>}
                  {i.paciente && <span> · {i.paciente}</span>}
                  {i.procedimento && <span> · {i.procedimento}</span>}
                </>
              )}
            />
          </TabsContent>

          {/* ============= LABORATÓRIOS ============= */}
          <TabsContent value="laboratorios" className="mt-4">
            <Section<Laboratorio>
              title="Laboratórios"
              description="Práticas e aulas de laboratório."
              icon={FlaskConical}
              items={laboratorios}
              setItems={setLaboratorios}
              fields={[
                { ...titleField, placeholder: "Ex.: Lab. Dentística — enceramento" },
                dateField,
                timeField,
                reminderField,
                { key: "local", label: "Local / Sala" },
                { key: "disciplina", label: "Disciplina" },
                { key: "atividade", label: "Atividade", placeholder: "Ex.: Enceramento, Anatomia dental" },
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.disciplina && <span>{i.disciplina}</span>}
                  {i.local && <span> · {i.local}</span>}
                  {i.atividade && <span> · {i.atividade}</span>}
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="materias" className="mt-4">
            <Section<Materia>
              title="Matérias"
              description="Disciplinas do semestre, professores e horários."
              icon={BookOpen}
              items={materias}
              setItems={setMaterias}
              showCheckbox={false}
              fields={[
                { ...titleField, placeholder: "Ex.: Dentística II" },
                { key: "professor", label: "Professor(a)" },
                { key: "horario", label: "Horário semanal", placeholder: "Seg 14h–18h" },
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.professor && <span>Prof. {i.professor}</span>}
                  {i.horario && <span> · {i.horario}</span>}
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="estagio" className="mt-4">
            <Section<Estagio>
              title="Estágio"
              description="Plantões, supervisores e locais de estágio."
              icon={Briefcase}
              items={estagio}
              setItems={setEstagio}
              fields={[
                titleField,
                dateField,
                timeField,
                reminderField,
                { key: "local", label: "Local", placeholder: "UBS / Hospital / Clínica" },
                { key: "supervisor", label: "Supervisor(a)" },
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.local && <span>{i.local}</span>}
                  {i.supervisor && <span> · Sup. {i.supervisor}</span>}
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="provas" className="mt-4">
            <Section<Prova>
              title="Provas"
              description="Datas de avaliações e conteúdos cobrados."
              icon={FileText}
              items={provas}
              setItems={setProvas}
              fields={[
                { ...titleField, placeholder: "P1 — Endodontia" },
                { key: "materia", label: "Matéria" },
                dateField,
                timeField,
                reminderField,
                { key: "conteudo", label: "Conteúdo", type: "textarea", placeholder: "Capítulos, slides..." },
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.materia && <span>{i.materia}</span>}
                  {i.conteudo && (
                    <span> · {i.conteudo.slice(0, 60)}{i.conteudo.length > 60 ? "…" : ""}</span>
                  )}
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="tbl" className="mt-4">
            <Section<Tbl>
              title="TBL"
              description="Team-Based Learning: temas e datas."
              icon={Users}
              items={tbl}
              setItems={setTbl}
              fields={[
                { ...titleField, placeholder: "TBL — Periodontia" },
                { key: "materia", label: "Matéria" },
                { key: "tema", label: "Tema" },
                dateField,
                timeField,
                reminderField,
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.materia && <span>{i.materia}</span>}
                  {i.tema && <span> · {i.tema}</span>}
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="trabalhos" className="mt-4">
            <Section<Trabalho>
              title="Trabalhos"
              description="Atividades, seminários e entregas."
              icon={ClipboardList}
              items={trabalhos}
              setItems={setTrabalhos}
              fields={[
                titleField,
                { key: "materia", label: "Matéria" },
                { key: "entrega", label: "Tipo de entrega", placeholder: "Apresentação, PDF, Moodle…" },
                dateField,
                timeField,
                reminderField,
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.materia && <span>{i.materia}</span>}
                  {i.entrega && <span> · {i.entrega}</span>}
                </>
              )}
            />
          </TabsContent>

          <TabsContent value="materiais" className="mt-4">
            <Section<Material>
              title="Lista de Materiais"
              description="O que comprar e levar — vincule a dias de clínica e laboratório."
              icon={Package}
              checkboxKey="comprado"
              items={materiais}
              setItems={setMateriais}
              fields={[
                { ...titleField, placeholder: "Ex.: Resina A2" },
                { key: "quantidade", label: "Quantidade", placeholder: "1 caixa, 2 unidades…" },
                {
                  key: "categoria",
                  label: "Categoria",
                  type: "select",
                  options: ["Dentística", "Endodontia", "Periodontia", "Cirurgia", "Prótese", "EPI", "Instrumental", "Outros"],
                },
                {
                  key: "clinicaIds",
                  label: "Usar em Clínica",
                  type: "multiselect",
                  options: clinicaOptions,
                },
                {
                  key: "laboratorioIds",
                  label: "Usar em Laboratório",
                  type: "multiselect",
                  options: labOptions,
                },
                notesField,
              ]}
              renderMeta={(i) => {
                const linkedClinica = (i.clinicaIds || [])
                  .map((id) => clinica.find((c) => c.id === id))
                  .filter(Boolean) as Clinica[];
                const linkedLab = (i.laboratorioIds || [])
                  .map((id) => laboratorios.find((l) => l.id === id))
                  .filter(Boolean) as Laboratorio[];
                return (
                  <div className="flex flex-wrap items-center gap-1">
                    {i.categoria && (
                      <Badge variant="outline" className="border-pink-200">
                        {i.categoria}
                      </Badge>
                    )}
                    {i.quantidade && (
                      <span className="text-sm text-muted-foreground">{i.quantidade}</span>
                    )}
                    {linkedClinica.map((c) => (
                      <Badge key={c.id} className="bg-pink-100 text-pink-800 hover:bg-pink-100">
                        <Stethoscope className="mr-1 h-3 w-3" />
                        {c.title}
                        {c.date ? ` · ${formatDate(c.date)}` : ""}
                      </Badge>
                    ))}
                    {linkedLab.map((l) => (
                      <Badge key={l.id} className="bg-rose-100 text-rose-800 hover:bg-rose-100">
                        <FlaskConical className="mr-1 h-3 w-3" />
                        {l.title}
                        {l.date ? ` · ${formatDate(l.date)}` : ""}
                      </Badge>
                    ))}
                  </div>
                );
              }}
            />
          </TabsContent>

          <TabsContent value="ic" className="mt-4">
            <Card className="mb-4 border-pink-200 bg-gradient-to-r from-pink-100 to-rose-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pink-800">
                  <Microscope className="h-5 w-5" /> Iniciação Científica
                </CardTitle>
                <p className="text-sm text-pink-900/70">
                  Espaço exclusivo para sua IC: reuniões, leituras, coletas, escrita e prazos.
                </p>
              </CardHeader>
            </Card>
            <Section<IcItem>
              title="Atividades da IC"
              description="Tudo relacionado ao seu projeto de pesquisa."
              icon={Microscope}
              items={ic}
              setItems={setIc}
              fields={[
                { ...titleField, placeholder: "Reunião com orientador" },
                {
                  key: "tipo",
                  label: "Tipo",
                  type: "select",
                  options: [
                    "Reunião",
                    "Leitura de artigo",
                    "Coleta de dados",
                    "Análise",
                    "Escrita",
                    "Submissão",
                    "Apresentação",
                    "Outro",
                  ],
                },
                { key: "orientador", label: "Orientador(a)" },
                dateField,
                timeField,
                reminderField,
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.tipo && <Badge variant="outline" className="mr-1">{i.tipo}</Badge>}
                  {i.orientador && <span>Orient. {i.orientador}</span>}
                </>
              )}
            />
          </TabsContent>
        </Tabs>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Seus dados ficam salvos neste navegador. 💗
        </p>
      </main>
    </div>
  );
}
