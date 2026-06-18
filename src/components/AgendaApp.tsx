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
  Bell,
  BellRing,
  Heart,
} from "lucide-react";
import { useLocalStorage, uid } from "@/lib/storage";
import { CalendarView, type CalendarEvent } from "@/components/CalendarView";
import { AllTasksView, useAllTasks } from "@/components/AllTasksView";
import { Settings2 } from "lucide-react";

type BaseItem = {
  id: string;
  title: string;
  date?: string;
  time?: string;
  endTime?: string;
  notes?: string;
  done?: boolean;
  /** minutes before date+time to notify; "" or undefined = no reminder */
  reminder?: string;
};

type Clinica = BaseItem & {
  local?: string; paciente?: string; procedimento?: string;
  recorrente?: boolean; diasSemana?: string[]; dataFim?: string;
};
type Materia = BaseItem & {
  professor?: string;
  recorrente?: boolean;
  diasSemana?: string[];
  dataFim?: string;
};
type Estagio = BaseItem & {
  local?: string; supervisor?: string;
  recorrente?: boolean; diasSemana?: string[]; dataFim?: string;
};
type IcReuniao = BaseItem & { orientador?: string; local?: string; pauta?: string };
type IcPrazo = BaseItem & { tipo?: string; descricao?: string };
type IcCongresso = BaseItem & { nome?: string; local?: string; submissao?: string };
type Prova = BaseItem & { materia?: string; conteudo?: string };
type Tbl = BaseItem & { materia?: string; tema?: string };
type Trabalho = BaseItem & { materia?: string; entrega?: string };
type Laboratorio = BaseItem & { local?: string; disciplina?: string; atividade?: string; materiaId?: string };
type Material = BaseItem & {
  quantidade?: string;
  categoria?: string;
  comprado?: boolean;
  clinicaIds?: string[];
  laboratorioIds?: string[];
  materiaIds?: string[];
};
type Pessoal = BaseItem & { categoria?: string; local?: string };

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
  pessoal: "agenda.pessoal",
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
  type?: "text" | "date" | "time24" | "textarea" | "select" | "multiselect" | "reminder" | "checkbox" | "weekdays";
  options?: { value: string; label: string }[] | string[];
  placeholder?: string;
  dependsOn?: { key: string; truthy: boolean };
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

            // conditional visibility
            if (f.dependsOn) {
              const depVal = !!(draft as any)[f.dependsOn.key];
              if (depVal !== f.dependsOn.truthy) return null;
            }

            if (f.type === "checkbox") {
              return (
                <label key={f.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-pink-100 bg-pink-50/40 px-3 py-2.5 hover:bg-pink-50">
                  <Checkbox
                    id={f.key}
                    checked={!!v}
                    onCheckedChange={(c) => setDraft({ ...draft, [f.key]: !!c })}
                  />
                  <span className="text-sm font-medium">{f.label}</span>
                </label>
              );
            }

            if (f.type === "weekdays") {
              const selected: string[] = Array.isArray(v) ? v : [];
              const days = [
                { val: "1", label: "Seg" }, { val: "2", label: "Ter" },
                { val: "3", label: "Qua" }, { val: "4", label: "Qui" },
                { val: "5", label: "Sex" }, { val: "6", label: "Sáb" },
                { val: "0", label: "Dom" },
              ];
              return (
                <div key={f.key} className="grid gap-1.5">
                  <Label>{f.label}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {days.map((d) => (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => {
                          const next = selected.includes(d.val)
                            ? selected.filter((x) => x !== d.val)
                            : [...selected, d.val];
                          setDraft({ ...draft, [f.key]: next });
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          selected.includes(d.val)
                            ? "bg-pink-600 text-white"
                            : "bg-pink-100 text-pink-700 hover:bg-pink-200"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            if (f.type === "time24") {
              return (
                <div key={f.key} className="grid gap-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    type="text"
                    inputMode="numeric"
                    placeholder={f.placeholder ?? "HH:MM"}
                    maxLength={5}
                    value={v ?? ""}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9:]/g, "");
                      if (val.length === 2 && !val.includes(":")) val += ":";
                      setDraft({ ...draft, [f.key]: val });
                    }}
                    onBlur={(e) => {
                      const m = e.target.value.match(/^(\d{1,2}):(\d{2})$/);
                      if (m) {
                        const h = Math.min(23, parseInt(m[1]));
                        const mn = Math.min(59, parseInt(m[2]));
                        setDraft({ ...draft, [f.key]: `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}` });
                      }
                    }}
                  />
                </div>
              );
            }

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
    fields.forEach((f) => {
      if (f.type === "multiselect" || f.type === "weekdays") d[f.key] = [];
      else if (f.type === "checkbox") d[f.key] = false;
      else d[f.key] = "";
    });
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
                          {item.time ? ` · ${item.time}${item.endTime ? `–${item.endTime}` : ""}` : ""}
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

type Task = { id: string; title: string; done?: boolean; date?: string; materiaId?: string };

function TasksPanel({
  tasks,
  setTasks,
  label,
  materias,
}: {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  label: string;
  materias?: Array<{ id: string; title: string }>;
}) {
  const [draft, setDraft] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftMateriaId, setDraftMateriaId] = useState("");

  const add = () => {
    const t = draft.trim();
    if (!t) {
      toast.error("Escreva uma tarefa");
      return;
    }
    setTasks([...tasks, { id: uid(), title: t, date: draftDate || undefined, done: false, materiaId: draftMateriaId || undefined }]);
    setDraft("");
    setDraftDate("");
    setDraftMateriaId("");
    toast.success("Tarefa adicionada");
  };

  const sorted = [...tasks].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return (a.date || "9999").localeCompare(b.date || "9999");
  });

  const pending = tasks.filter((t) => !t.done).length;

  return (
    <Card className="border-pink-100">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-pink-600" /> Tarefas — {label}
          </span>
          <Badge variant="secondary" className="bg-pink-100 text-pink-800">
            {pending} pendente{pending === 1 ? "" : "s"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Nova tarefa…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            className="flex-1"
          />
          <Input
            type="date"
            value={draftDate}
            onChange={(e) => setDraftDate(e.target.value)}
            className="sm:w-44"
          />
          {materias && materias.length > 0 && (
            <Select value={draftMateriaId || "__none__"} onValueChange={(v) => setDraftMateriaId(v === "__none__" ? "" : v)}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Matéria (opt.)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem matéria</SelectItem>
                {materias.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={add} className="bg-pink-600 hover:bg-pink-700">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-pink-200 bg-pink-50/40 py-8 text-center text-sm text-muted-foreground">
            Nenhuma tarefa por aqui ainda.
          </div>
        ) : (
          <ul className="grid gap-1.5">
            {sorted.map((t) => {
              const mat = t.materiaId && materias ? materias.find((m) => m.id === t.materiaId) : null;
              return (
              <li
                key={t.id}
                className={`flex items-center gap-3 rounded-lg border bg-card p-2.5 transition ${
                  t.done ? "border-pink-100 opacity-60" : "border-border hover:border-pink-200"
                }`}
              >
                <Checkbox
                  checked={!!t.done}
                  onCheckedChange={(v) =>
                    setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !!v } : x)))
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${t.done ? "line-through" : ""}`}>
                    {t.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    {t.date && <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>}
                    {mat && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">{mat.title}</Badge>}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setTasks(tasks.filter((x) => x.id !== t.id));
                    toast.success("Tarefa removida");
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AreaTabs({
  tasks,
  setTasks,
  label,
  materias,
  children,
}: {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  label: string;
  materias?: Array<{ id: string; title: string }>;
  children: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="itens" className="w-full">
      <TabsList className="bg-pink-100/60">
        <TabsTrigger value="itens" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
          Itens
        </TabsTrigger>
        <TabsTrigger value="tarefas" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
          Tarefas
        </TabsTrigger>
      </TabsList>
      <TabsContent value="itens" className="mt-3">{children}</TabsContent>
      <TabsContent value="tarefas" className="mt-3">
        <TasksPanel tasks={tasks} setTasks={setTasks} label={label} materias={materias} />
      </TabsContent>
    </Tabs>
  );
}

const titleField: FieldDef = {
  key: "title",
  label: "Título",
  placeholder: "Ex.: Restauração canal 26",
};
const dateField: FieldDef = { key: "date", label: "Data", type: "date" };
const timeField: FieldDef = { key: "time", label: "Início", type: "time24", placeholder: "HH:MM" };
const endTimeField: FieldDef = { key: "endTime", label: "Fim", type: "time24", placeholder: "HH:MM" };
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
  const [pessoal, setPessoal] = useLocalStorage<Pessoal[]>(STORAGE_KEYS.pessoal, []);
  const [icReunioes, setIcReunioes] = useLocalStorage<IcReuniao[]>("agenda.ic.reunioes", []);
  const [icPrazos, setIcPrazos] = useLocalStorage<IcPrazo[]>("agenda.ic.prazos", []);
  const [icCongressos, setIcCongressos] = useLocalStorage<IcCongresso[]>("agenda.ic.congressos", []);
  const [icTitulo, setIcTitulo] = useLocalStorage<string>(
    "agenda.ic.titulo",
    "Iniciação Científica",
  );
  const [icEditingTitle, setIcEditingTitle] = useState(false);
  const [icTituloDraft, setIcTituloDraft] = useState(icTitulo);
  const [tab, setTab] = useState("agenda");
  const taskGroups = useAllTasks();

  const [appConfig, setAppConfig] = useLocalStorage<{ name: string; subtitle: string; emoji: string }>(
    "agenda.config",
    { name: "Agenda Odonto", subtitle: "Tudo da faculdade num só lugar.", emoji: "🦷" },
  );
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerDraft, setHeaderDraft] = useState(appConfig);

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "denied",
  );

  const allDated = useMemo(
    () => [
      ...clinica.filter((i) => !i.recorrente).map((i) => ({ kind: "Clínica", tab: "clinica", item: i as BaseItem })),
      ...estagio.filter((i) => !i.recorrente).map((i) => ({ kind: "Estágio", tab: "estagio", item: i as BaseItem })),
      ...materias.filter((m) => !m.recorrente).map((i) => ({ kind: "Matéria", tab: "materias", item: i as BaseItem })),
      ...provas.map((i) => ({ kind: "Prova", tab: "provas", item: i as BaseItem })),
      ...tbl.map((i) => ({ kind: "TBL", tab: "tbl", item: i as BaseItem })),
      ...trabalhos.map((i) => ({ kind: "Trabalho", tab: "trabalhos", item: i as BaseItem })),
      ...laboratorios.map((i) => ({ kind: "Laboratório", tab: "laboratorios", item: i as BaseItem })),
      ...pessoal.map((i) => ({ kind: "Pessoal", tab: "pessoal", item: i as BaseItem })),
      ...icReunioes.map((i) => ({ kind: "IC", tab: "ic", item: i as BaseItem })),
      ...icPrazos.map((i) => ({ kind: "IC", tab: "ic", item: i as BaseItem })),
      ...icCongressos.map((i) => ({ kind: "IC", tab: "ic", item: i as BaseItem })),
    ],
    [clinica, estagio, materias, provas, tbl, trabalhos, laboratorios, pessoal, icReunioes, icPrazos, icCongressos],
  );

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    // regular dated events
    const events: CalendarEvent[] = allDated
      .filter((x) => x.item.date && !x.item.done)
      .map((x) => ({
        id: x.item.id,
        title: x.item.title,
        date: x.item.date!,
        time: x.item.time,
        endTime: x.item.endTime,
        kind: x.kind,
        tab: x.tab,
      }));

    // helper: expand recurring item into calendar events
    const winStart = new Date();
    winStart.setDate(winStart.getDate() - 30);
    winStart.setHours(0, 0, 0, 0);
    const expandRecurring = (
      item: { id: string; title: string; recorrente?: boolean; diasSemana?: string[]; time?: string; endTime?: string; dataFim?: string },
      kind: string,
      tab: string,
    ) => {
      if (!item.recorrente || !item.diasSemana?.length) return;
      const winEnd = item.dataFim
        ? new Date(item.dataFim + "T23:59:59")
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const diasSet = new Set(item.diasSemana.map(Number));
      const cur = new Date(winStart);
      while (cur <= winEnd) {
        if (diasSet.has(cur.getDay())) {
          const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
          events.push({ id: `${item.id}-${ds}`, title: item.title, date: ds, time: item.time, endTime: item.endTime, kind, tab });
        }
        cur.setDate(cur.getDate() + 1);
      }
    };

    // expand recurring matérias (non-recurring ones are in allDated via date field)
    materias.forEach((m) => expandRecurring(m, "Matéria", "materias"));
    // expand recurring clínica and estágio
    clinica.forEach((c) => expandRecurring(c, "Clínica", "clinica"));
    estagio.forEach((e) => expandRecurring(e, "Estágio", "estagio"));

    // dated tasks (all-day)
    taskGroups.forEach((g) => {
      g.tasks.filter((t) => t.date && !t.done).forEach((t) => {
        events.push({
          id: `task-${t.id}`,
          title: t.title,
          date: t.date!,
          time: undefined,
          kind: "Tarefa",
          tab: "tarefas",
        });
      });
    });

    return events;
  }, [allDated, materias, clinica, estagio, icReunioes, icPrazos, icCongressos, taskGroups]);

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
  const materiaOptions = useMemo(
    () => materias.map((m) => ({ value: m.id, label: m.title })),
    [materias],
  );
  const materiaTitleOptions = useMemo(
    () => materias.map((m) => ({ value: m.title, label: m.title })),
    [materias],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white">
      <Toaster richColors position="top-center" />

      {/* Header config dialog */}
      <Dialog open={editingHeader} onOpenChange={setEditingHeader}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personalizar cabeçalho</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Emoji</Label>
              <Input
                value={headerDraft.emoji}
                onChange={(e) => setHeaderDraft({ ...headerDraft, emoji: e.target.value })}
                placeholder="🦷"
                maxLength={4}
                className="w-20 text-center text-xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input
                value={headerDraft.name}
                onChange={(e) => setHeaderDraft({ ...headerDraft, name: e.target.value })}
                placeholder="Agenda"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Subtítulo</Label>
              <Input
                value={headerDraft.subtitle}
                onChange={(e) => setHeaderDraft({ ...headerDraft, subtitle: e.target.value })}
                placeholder="Para a mais linda"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingHeader(false)}>Cancelar</Button>
            <Button
              className="bg-pink-600 hover:bg-pink-700"
              onClick={() => { setAppConfig(headerDraft); setEditingHeader(false); }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="border-b border-pink-100/80 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <button
            onClick={() => { setHeaderDraft(appConfig); setEditingHeader(true); }}
            className="group flex items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-pink-50"
            title="Personalizar"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-2xl shadow-sm">
              {appConfig.emoji}
            </div>
            <div className="text-left">
              <h1 className="bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                {appConfig.name}
              </h1>
              <p className="text-xs text-muted-foreground">{appConfig.subtitle}</p>
            </div>
            <Settings2 className="ml-1 h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
          </button>
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
            <TabsTrigger value="agenda" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
              <CalendarDays className="mr-1 h-4 w-4" />Agenda
            </TabsTrigger>
            <TabsTrigger value="tarefas" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white">
              <ClipboardList className="mr-1 h-4 w-4" />Tarefas
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
            <TabsTrigger value="pessoal"><Heart className="mr-1 h-4 w-4" />Pessoal</TabsTrigger>
          </TabsList>

          {/* ============= AGENDA ============= */}
          <TabsContent value="agenda" className="mt-4">
            <CalendarView events={calendarEvents} onEventClick={(t) => setTab(t)} />
          </TabsContent>

          {/* ============= TAREFAS ============= */}
          <TabsContent value="tarefas" className="mt-4">
            <AllTasksView categories={taskGroups} materias={materias} />
          </TabsContent>

          {/* ============= CLÍNICA ============= */}
          <TabsContent value="clinica" className="mt-4">
            <AreaTabs tasks={taskGroups[0].tasks} setTasks={taskGroups[0].setTasks} label="Clínica" materias={materias}>
            <Section<Clinica>
              title="Dias de Clínica"
              description="Agende seus atendimentos, pacientes e procedimentos."
              icon={Stethoscope}
              items={clinica}
              setItems={setClinica}
              fields={[
                titleField,
                { key: "recorrente", label: "Evento recorrente (repete toda semana)", type: "checkbox" },
                { key: "diasSemana", label: "Dias da semana", type: "weekdays", dependsOn: { key: "recorrente", truthy: true } },
                { key: "dataFim", label: "Repetir até", type: "date", dependsOn: { key: "recorrente", truthy: true } },
                { ...dateField, dependsOn: { key: "recorrente", truthy: false } } as FieldDef,
                timeField,
                endTimeField,
                reminderField,
                { key: "local", label: "Clínica / Sala", placeholder: "Clínica 2 — Box 4" },
                { key: "paciente", label: "Paciente" },
                { key: "procedimento", label: "Procedimento", placeholder: "Ex.: Restauração, Endo, Profilaxia" },
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.recorrente && <Badge className="mr-1 bg-pink-100 text-pink-700 hover:bg-pink-100">Recorrente</Badge>}
                  {i.local && <span>{i.local}</span>}
                  {i.paciente && <span> · {i.paciente}</span>}
                  {i.procedimento && <span> · {i.procedimento}</span>}
                </>
              )}
            />
          </AreaTabs>
          </TabsContent>

          {/* ============= LABORATÓRIOS ============= */}
          <TabsContent value="laboratorios" className="mt-4">
            <AreaTabs tasks={taskGroups[1].tasks} setTasks={taskGroups[1].setTasks} label="Laboratórios" materias={materias}>
            <Section<Laboratorio>
              title="Laboratórios"
              description="Práticas e aulas de laboratório."
              icon={FlaskConical}
              items={laboratorios}
              setItems={setLaboratorios}
              fields={[
                { ...titleField, placeholder: "Ex.: Lab. Dentística — enceramento" },
                { key: "materiaId", label: "Matéria", type: "select", options: materiaOptions, placeholder: "Selecione a matéria" },
                dateField,
                timeField,
                endTimeField,
                reminderField,
                { key: "local", label: "Local / Sala" },
                { key: "disciplina", label: "Disciplina" },
                { key: "atividade", label: "Atividade", placeholder: "Ex.: Enceramento, Anatomia dental" },
                notesField,
              ]}
              renderMeta={(i) => {
                const mat = i.materiaId ? materias.find((m) => m.id === i.materiaId) : null;
                return (
                  <>
                    {mat && <Badge variant="outline" className="mr-1 border-blue-200 text-blue-700">{mat.title}</Badge>}
                    {i.disciplina && <span>{i.disciplina}</span>}
                    {i.local && <span> · {i.local}</span>}
                    {i.atividade && <span> · {i.atividade}</span>}
                  </>
                );
              }}
            />
          </AreaTabs>
          </TabsContent>

          <TabsContent value="materias" className="mt-4">
            <AreaTabs tasks={taskGroups[2].tasks} setTasks={taskGroups[2].setTasks} label="Matérias" materias={materias}>
            <Section<Materia>
              title="Matérias"
              description="Disciplinas do semestre — eventos vão automaticamente para a agenda."
              icon={BookOpen}
              items={materias}
              setItems={setMaterias}
              showCheckbox={false}
              fields={[
                { ...titleField, placeholder: "Ex.: Dentística II" },
                { key: "professor", label: "Professor(a)" },
                { key: "recorrente", label: "Evento recorrente (repete toda semana)", type: "checkbox" },
                { key: "diasSemana", label: "Dias da semana", type: "weekdays", dependsOn: { key: "recorrente", truthy: true } },
                { key: "dataFim", label: "Repetir até", type: "date", dependsOn: { key: "recorrente", truthy: true } },
                { ...dateField, dependsOn: { key: "recorrente", truthy: false } } as FieldDef,
                timeField,
                endTimeField,
                reminderField,
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.professor && <span>Prof. {i.professor}</span>}
                  {i.recorrente
                    ? <Badge className="ml-1 bg-blue-100 text-blue-700 hover:bg-blue-100">Recorrente</Badge>
                    : i.date && <Badge variant="secondary" className="ml-1 bg-blue-50 text-blue-700">{formatDate(i.date)}{i.time ? ` · ${i.time}${i.endTime ? `–${i.endTime}` : ""}` : ""}</Badge>
                  }
                </>
              )}
            />
          </AreaTabs>
          </TabsContent>

          <TabsContent value="estagio" className="mt-4">
            <AreaTabs tasks={taskGroups[3].tasks} setTasks={taskGroups[3].setTasks} label="Estágio" materias={materias}>
            <Section<Estagio>
              title="Estágio"
              description="Plantões, supervisores e locais de estágio."
              icon={Briefcase}
              items={estagio}
              setItems={setEstagio}
              fields={[
                titleField,
                { key: "recorrente", label: "Evento recorrente (repete toda semana)", type: "checkbox" },
                { key: "diasSemana", label: "Dias da semana", type: "weekdays", dependsOn: { key: "recorrente", truthy: true } },
                { key: "dataFim", label: "Repetir até", type: "date", dependsOn: { key: "recorrente", truthy: true } },
                { ...dateField, dependsOn: { key: "recorrente", truthy: false } } as FieldDef,
                timeField,
                endTimeField,
                reminderField,
                { key: "local", label: "Local", placeholder: "UBS / Hospital / Clínica" },
                { key: "supervisor", label: "Supervisor(a)" },
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.recorrente && <Badge className="mr-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Recorrente</Badge>}
                  {i.local && <span>{i.local}</span>}
                  {i.supervisor && <span> · Sup. {i.supervisor}</span>}
                </>
              )}
            />
          </AreaTabs>
          </TabsContent>

          <TabsContent value="provas" className="mt-4">
            <AreaTabs tasks={taskGroups[4].tasks} setTasks={taskGroups[4].setTasks} label="Provas" materias={materias}>
            <Section<Prova>
              title="Provas"
              description="Datas de avaliações e conteúdos cobrados."
              icon={FileText}
              items={provas}
              setItems={setProvas}
              fields={[
                { ...titleField, placeholder: "P1 — Endodontia" },
                { key: "materia", label: "Matéria", type: "select", options: materiaTitleOptions, placeholder: "Selecione ou deixe em branco" },
                dateField,
                timeField,
                endTimeField,
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
          </AreaTabs>
          </TabsContent>

          <TabsContent value="tbl" className="mt-4">
            <AreaTabs tasks={taskGroups[5].tasks} setTasks={taskGroups[5].setTasks} label="TBL" materias={materias}>
            <Section<Tbl>
              title="TBL"
              description="Team-Based Learning: temas e datas."
              icon={Users}
              items={tbl}
              setItems={setTbl}
              fields={[
                { ...titleField, placeholder: "TBL — Periodontia" },
                { key: "materia", label: "Matéria", type: "select", options: materiaTitleOptions, placeholder: "Selecione ou deixe em branco" },
                { key: "tema", label: "Tema" },
                dateField,
                timeField,
                endTimeField,
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
          </AreaTabs>
          </TabsContent>

          <TabsContent value="trabalhos" className="mt-4">
            <AreaTabs tasks={taskGroups[6].tasks} setTasks={taskGroups[6].setTasks} label="Trabalhos" materias={materias}>
            <Section<Trabalho>
              title="Trabalhos"
              description="Atividades, seminários e entregas."
              icon={ClipboardList}
              items={trabalhos}
              setItems={setTrabalhos}
              fields={[
                titleField,
                { key: "materia", label: "Matéria", type: "select", options: materiaTitleOptions, placeholder: "Selecione ou deixe em branco" },
                { key: "entrega", label: "Tipo de entrega", placeholder: "Apresentação, PDF, Moodle…" },
                dateField,
                timeField,
                endTimeField,
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
          </AreaTabs>
          </TabsContent>

          <TabsContent value="materiais" className="mt-4">
            <AreaTabs tasks={taskGroups[7].tasks} setTasks={taskGroups[7].setTasks} label="Materiais" materias={materias}>
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
                {
                  key: "materiaIds",
                  label: "Matérias relacionadas",
                  type: "multiselect",
                  options: materiaOptions,
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
                const linkedMaterias = (i.materiaIds || [])
                  .map((id) => materias.find((m) => m.id === id))
                  .filter(Boolean) as Materia[];
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
                    {linkedMaterias.map((m) => (
                      <Badge key={m.id} className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                        <BookOpen className="mr-1 h-3 w-3" />
                        {m.title}
                      </Badge>
                    ))}
                  </div>
                );
              }}
            />
          </AreaTabs>
          </TabsContent>

          <TabsContent value="ic" className="mt-4">
            {/* IC Title card */}
            <Card className="mb-4 border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Microscope className="mt-1 h-5 w-5 shrink-0 text-indigo-600" />
                  <div className="flex-1 min-w-0">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">Título da IC</p>
                    {icEditingTitle ? (
                      <div className="flex flex-col gap-2">
                        <Textarea
                          value={icTituloDraft}
                          onChange={(e) => setIcTituloDraft(e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => { setIcTitulo(icTituloDraft); setIcEditingTitle(false); }}
                          >
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setIcTituloDraft(icTitulo); setIcEditingTitle(false); }}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="group flex w-full items-start gap-2 text-left"
                        onClick={() => { setIcTituloDraft(icTitulo); setIcEditingTitle(true); }}
                      >
                        <span className="text-sm font-medium leading-snug text-foreground">{icTitulo}</span>
                        <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* IC sub-tabs */}
            <Tabs defaultValue="tarefas" className="w-full">
              <TabsList className="bg-indigo-100/60">
                <TabsTrigger value="tarefas" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Tarefas</TabsTrigger>
                <TabsTrigger value="reunioes" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Reuniões</TabsTrigger>
                <TabsTrigger value="prazos" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Prazos</TabsTrigger>
                <TabsTrigger value="congressos" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">Congressos</TabsTrigger>
              </TabsList>
              <TabsContent value="tarefas" className="mt-3">
                <TasksPanel tasks={taskGroups[8].tasks} setTasks={taskGroups[8].setTasks} label="IC" materias={materias} />
              </TabsContent>
              <TabsContent value="reunioes" className="mt-3">
                <Section<IcReuniao>
                  title="Reuniões"
                  description="Reuniões com orientador e colaboradores."
                  icon={Users}
                  items={icReunioes}
                  setItems={setIcReunioes}
                  fields={[
                    { ...titleField, placeholder: "Reunião de orientação" },
                    { key: "orientador", label: "Orientador(a)" },
                    { key: "local", label: "Local / Link", placeholder: "Sala 204 ou Meet" },
                    { key: "pauta", label: "Pauta", type: "textarea", placeholder: "Tópicos a discutir..." },
                    dateField,
                    timeField,
                    endTimeField,
                    reminderField,
                    notesField,
                  ]}
                  renderMeta={(i) => (
                    <>
                      {i.orientador && <span>Orient. {i.orientador}</span>}
                      {i.local && <span> · {i.local}</span>}
                    </>
                  )}
                />
              </TabsContent>
              <TabsContent value="prazos" className="mt-3">
                <Section<IcPrazo>
                  title="Prazos"
                  description="Entregas, submissões e datas-limite."
                  icon={CalendarDays}
                  items={icPrazos}
                  setItems={setIcPrazos}
                  fields={[
                    { ...titleField, placeholder: "Entrega do relatório" },
                    { key: "tipo", label: "Tipo", type: "select", options: ["Relatório", "Artigo", "Resumo", "Apresentação", "Outro"] },
                    { key: "descricao", label: "Descrição", type: "textarea" },
                    dateField,
                    timeField,
                    endTimeField,
                    reminderField,
                    notesField,
                  ]}
                  renderMeta={(i) => (
                    <>
                      {i.tipo && <Badge variant="outline" className="mr-1 border-indigo-200 text-indigo-700">{i.tipo}</Badge>}
                      {i.descricao && <span>{i.descricao.slice(0, 60)}{i.descricao.length > 60 ? "…" : ""}</span>}
                    </>
                  )}
                />
              </TabsContent>
              <TabsContent value="congressos" className="mt-3">
                <Section<IcCongresso>
                  title="Congressos"
                  description="Eventos científicos, submissões e inscrições."
                  icon={Briefcase}
                  items={icCongressos}
                  setItems={setIcCongressos}
                  fields={[
                    { ...titleField, placeholder: "JORNADA SBPQO 2025" },
                    { key: "nome", label: "Nome completo do evento" },
                    { key: "local", label: "Local / Cidade" },
                    { key: "submissao", label: "Prazo de submissão", type: "date" },
                    dateField,
                    timeField,
                    endTimeField,
                    reminderField,
                    notesField,
                  ]}
                  renderMeta={(i) => (
                    <>
                      {i.local && <span>{i.local}</span>}
                      {i.submissao && <Badge variant="outline" className="ml-1 border-indigo-200 text-indigo-700">Submissão: {formatDate(i.submissao)}</Badge>}
                    </>
                  )}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="pessoal" className="mt-4">
            <AreaTabs tasks={taskGroups[9].tasks} setTasks={taskGroups[9].setTasks} label="Pessoal" materias={materias}>
            <Section<Pessoal>
              title="Pessoal"
              description="Compromissos e tarefas da vida pessoal: saúde, lazer, consultas e afazeres."
              icon={Heart}
              items={pessoal}
              setItems={setPessoal}
              fields={[
                { ...titleField, placeholder: "Ex.: Consulta dermatologista" },
                dateField,
                timeField,
                endTimeField,
                reminderField,
                {
                  key: "categoria",
                  label: "Categoria",
                  type: "select",
                  options: ["Saúde", "Bem-estar", "Lazer", "Social", "Tarefas", "Outros"],
                },
                { key: "local", label: "Local", placeholder: "Endereço ou estabelecimento" },
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.categoria && <Badge variant="outline" className="mr-1">{i.categoria}</Badge>}
                  {i.local && <span>{i.local}</span>}
                </>
              )}
            />
          </AreaTabs>
          </TabsContent>
        </Tabs>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Seus dados ficam salvos neste navegador. 💗
        </p>
      </main>
    </div>
  );
}
