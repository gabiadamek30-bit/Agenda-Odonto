import { useMemo, useState } from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalStorage, uid } from "@/lib/storage";

export type Task = { id: string; title: string; done?: boolean; date?: string; materiaId?: string };

export const TASK_CATS = [
  { storageKey: "agenda.tasks.clinica",      label: "Clínica",      color: "bg-pink-500",    textColor: "text-pink-700",    badgeCls: "bg-pink-100 text-pink-800" },
  { storageKey: "agenda.tasks.laboratorios", label: "Laboratórios", color: "bg-violet-500",  textColor: "text-violet-700",  badgeCls: "bg-violet-100 text-violet-800" },
  { storageKey: "agenda.tasks.materias",     label: "Matérias",     color: "bg-blue-500",    textColor: "text-blue-700",    badgeCls: "bg-blue-100 text-blue-800" },
  { storageKey: "agenda.tasks.estagio",      label: "Estágio",      color: "bg-emerald-500", textColor: "text-emerald-700", badgeCls: "bg-emerald-100 text-emerald-800" },
  { storageKey: "agenda.tasks.provas",       label: "Provas",       color: "bg-red-500",     textColor: "text-red-700",     badgeCls: "bg-red-100 text-red-800" },
  { storageKey: "agenda.tasks.tbl",          label: "TBL",          color: "bg-amber-500",   textColor: "text-amber-700",   badgeCls: "bg-amber-100 text-amber-800" },
  { storageKey: "agenda.tasks.trabalhos",    label: "Trabalhos",    color: "bg-cyan-600",    textColor: "text-cyan-700",    badgeCls: "bg-cyan-100 text-cyan-800" },
  { storageKey: "agenda.tasks.materiais",    label: "Materiais",    color: "bg-orange-500",  textColor: "text-orange-700",  badgeCls: "bg-orange-100 text-orange-800" },
  { storageKey: "agenda.tasks.ic",           label: "IC",           color: "bg-indigo-500",  textColor: "text-indigo-700",  badgeCls: "bg-indigo-100 text-indigo-800" },
  { storageKey: "agenda.tasks.pessoal",      label: "Pessoal",      color: "bg-fuchsia-500", textColor: "text-fuchsia-700", badgeCls: "bg-fuchsia-100 text-fuchsia-800" },
] as const;

export type TaskGroup = (typeof TASK_CATS)[number] & {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
};

export function useAllTasks(): TaskGroup[] {
  const [t0, s0] = useLocalStorage<Task[]>(TASK_CATS[0].storageKey, []);
  const [t1, s1] = useLocalStorage<Task[]>(TASK_CATS[1].storageKey, []);
  const [t2, s2] = useLocalStorage<Task[]>(TASK_CATS[2].storageKey, []);
  const [t3, s3] = useLocalStorage<Task[]>(TASK_CATS[3].storageKey, []);
  const [t4, s4] = useLocalStorage<Task[]>(TASK_CATS[4].storageKey, []);
  const [t5, s5] = useLocalStorage<Task[]>(TASK_CATS[5].storageKey, []);
  const [t6, s6] = useLocalStorage<Task[]>(TASK_CATS[6].storageKey, []);
  const [t7, s7] = useLocalStorage<Task[]>(TASK_CATS[7].storageKey, []);
  const [t8, s8] = useLocalStorage<Task[]>(TASK_CATS[8].storageKey, []);
  const [t9, s9] = useLocalStorage<Task[]>(TASK_CATS[9].storageKey, []);

  return [
    { ...TASK_CATS[0], tasks: t0, setTasks: s0 },
    { ...TASK_CATS[1], tasks: t1, setTasks: s1 },
    { ...TASK_CATS[2], tasks: t2, setTasks: s2 },
    { ...TASK_CATS[3], tasks: t3, setTasks: s3 },
    { ...TASK_CATS[4], tasks: t4, setTasks: s4 },
    { ...TASK_CATS[5], tasks: t5, setTasks: s5 },
    { ...TASK_CATS[6], tasks: t6, setTasks: s6 },
    { ...TASK_CATS[7], tasks: t7, setTasks: s7 },
    { ...TASK_CATS[8], tasks: t8, setTasks: s8 },
    { ...TASK_CATS[9], tasks: t9, setTasks: s9 },
  ];
}

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

export function AllTasksView({
  categories,
  materias,
}: {
  categories: TaskGroup[];
  materias?: Array<{ id: string; title: string }>;
}) {
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftCatIdx, setDraftCatIdx] = useState("0");
  const [draftMateriaId, setDraftMateriaId] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<number>>(
    () => new Set(categories.map((_, i) => i)),
  );
  const [showDone, setShowDone] = useState(false);

  const flatTasks = useMemo(
    () =>
      categories.flatMap((cat, catIdx) =>
        cat.tasks.map((t) => ({ ...t, catIdx })),
      ),
    [categories],
  );

  const filtered = useMemo(
    () =>
      flatTasks
        .filter((t) => activeFilters.has(t.catIdx))
        .filter((t) => showDone || !t.done)
        .sort((a, b) => {
          if (!!a.done !== !!b.done) return a.done ? 1 : -1;
          return (a.date || "9999").localeCompare(b.date || "9999");
        }),
    [flatTasks, activeFilters, showDone],
  );

  const pendingCount = useMemo(
    () => flatTasks.filter((t) => !t.done && activeFilters.has(t.catIdx)).length,
    [flatTasks, activeFilters],
  );

  const toggleFilter = (i: number) =>
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const addTask = () => {
    const title = draftTitle.trim();
    if (!title) {
      toast.error("Escreva uma tarefa");
      return;
    }
    const idx = parseInt(draftCatIdx, 10);
    const { tasks, setTasks } = categories[idx];
    setTasks([...tasks, { id: uid(), title, date: draftDate || undefined, done: false, materiaId: draftMateriaId || undefined }]);
    setDraftTitle("");
    setDraftDate("");
    setDraftMateriaId("");
    toast.success("Tarefa adicionada");
  };

  const toggleDone = (catIdx: number, id: string) => {
    const { tasks, setTasks } = categories[catIdx];
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTask = (catIdx: number, id: string) => {
    const { tasks, setTasks } = categories[catIdx];
    setTasks(tasks.filter((t) => t.id !== id));
    toast.success("Tarefa removida");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Add task */}
      <Card className="border-pink-100">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Nova tarefa…"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              className="flex-1"
            />
            <Input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="sm:w-40"
            />
            <Select value={draftCatIdx} onValueChange={setDraftCatIdx}>
              <SelectTrigger className="sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat, i) => (
                  <SelectItem key={cat.storageKey} value={String(i)}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button onClick={addTask} className="bg-pink-600 hover:bg-pink-700">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
        </span>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {categories.map((cat, i) => (
            <button
              key={cat.storageKey}
              onClick={() => toggleFilter(i)}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                activeFilters.has(i)
                  ? `${cat.color} border-transparent text-white`
                  : `bg-white ${cat.textColor} border-current opacity-50 hover:opacity-100`
              }`}
            >
              {cat.label}
            </button>
          ))}
          <button
            onClick={() => setShowDone((v) => !v)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
              showDone
                ? "border-transparent bg-slate-500 text-white"
                : "border-current bg-white text-slate-500 opacity-60 hover:opacity-100"
            }`}
          >
            Concluídas
          </button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-pink-200 bg-pink-50/40 py-12 text-center text-sm text-muted-foreground">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 text-pink-300" />
          {showDone ? "Nenhuma tarefa encontrada." : "Sem tarefas pendentes. 🎉"}
        </div>
      ) : (
        <ul className="grid gap-1.5">
          {filtered.map((t) => {
            const cat = categories[t.catIdx];
            const materia = t.materiaId && materias ? materias.find((m) => m.id === t.materiaId) : null;
            return (
              <li
                key={`${t.catIdx}-${t.id}`}
                className={`flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition ${
                  t.done ? "border-pink-100 opacity-50" : "border-border hover:border-pink-200"
                }`}
              >
                <Checkbox
                  checked={!!t.done}
                  onCheckedChange={() => toggleDone(t.catIdx, t.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium ${t.done ? "line-through text-muted-foreground" : ""}`}>
                    {t.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    {t.date && (
                      <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                    )}
                    {materia && (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs">{materia.title}</Badge>
                    )}
                  </div>
                </div>
                <Badge className={`shrink-0 text-xs ${cat.badgeCls} hover:${cat.badgeCls}`}>
                  {cat.label}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteTask(t.catIdx, t.id)}
                  className="shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
