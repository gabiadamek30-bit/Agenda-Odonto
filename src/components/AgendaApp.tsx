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
  DialogTrigger,
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
} from "lucide-react";
import { useLocalStorage, uid } from "@/lib/storage";

type BaseItem = {
  id: string;
  title: string;
  date?: string;
  time?: string;
  notes?: string;
  done?: boolean;
};

type Clinica = BaseItem & { local?: string; paciente?: string; procedimento?: string };
type Materia = BaseItem & { professor?: string; horario?: string };
type Estagio = BaseItem & { local?: string; supervisor?: string };
type Prova = BaseItem & { materia?: string; conteudo?: string };
type Tbl = BaseItem & { materia?: string; tema?: string };
type Trabalho = BaseItem & { materia?: string; entrega?: string };
type Material = BaseItem & { quantidade?: string; categoria?: string; comprado?: boolean };
type IcItem = BaseItem & { tipo?: string; orientador?: string };

const STORAGE_KEYS = {
  clinica: "agenda.clinica",
  materias: "agenda.materias",
  estagio: "agenda.estagio",
  provas: "agenda.provas",
  tbl: "agenda.tbl",
  trabalhos: "agenda.trabalhos",
  materiais: "agenda.materiais",
  ic: "agenda.ic",
};

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
  return [...items].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
}

type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "date" | "time" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
};

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
          {fields.map((f) => (
            <div key={f.key} className="grid gap-1.5">
              <Label htmlFor={f.key}>{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  id={f.key}
                  value={(draft as any)[f.key] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                />
              ) : f.type === "select" ? (
                <Select
                  value={(draft as any)[f.key] ?? ""}
                  onValueChange={(v) => setDraft({ ...draft, [f.key]: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={f.placeholder || "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={f.key}
                  type={f.type || "text"}
                  value={(draft as any)[f.key] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}
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
              onSave(draft);
              onOpenChange(false);
            }}
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
    fields.forEach((f) => (d[f.key] = ""));
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
                      <span
                        className={`font-medium ${checked ? "line-through" : ""}`}
                      >
                        {item.title}
                      </span>
                      {item.date && (
                        <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                          <CalendarDays className="mr-1 h-3 w-3" />
                          {formatDate(item.date)}
                          {item.time ? ` · ${item.time}` : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {renderMeta(item)}
                    </div>
                    {item.notes && (
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
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

const titleField: FieldDef = { key: "title", label: "Título", placeholder: "Ex.: Restauração canal 26" };
const dateField: FieldDef = { key: "date", label: "Data", type: "date" };
const timeField: FieldDef = { key: "time", label: "Horário", type: "time" };
const notesField: FieldDef = { key: "notes", label: "Observações", type: "textarea" };

export default function AgendaApp() {
  const [clinica, setClinica] = useLocalStorage<Clinica[]>(STORAGE_KEYS.clinica, []);
  const [materias, setMaterias] = useLocalStorage<Materia[]>(STORAGE_KEYS.materias, []);
  const [estagio, setEstagio] = useLocalStorage<Estagio[]>(STORAGE_KEYS.estagio, []);
  const [provas, setProvas] = useLocalStorage<Prova[]>(STORAGE_KEYS.provas, []);
  const [tbl, setTbl] = useLocalStorage<Tbl[]>(STORAGE_KEYS.tbl, []);
  const [trabalhos, setTrabalhos] = useLocalStorage<Trabalho[]>(STORAGE_KEYS.trabalhos, []);
  const [materiais, setMateriais] = useLocalStorage<Material[]>(STORAGE_KEYS.materiais, []);
  const [ic, setIc] = useLocalStorage<IcItem[]>(STORAGE_KEYS.ic, []);

  const upcoming = useMemo(() => {
    const all: Array<{ kind: string; item: BaseItem }> = [
      ...clinica.map((i) => ({ kind: "Clínica", item: i })),
      ...estagio.map((i) => ({ kind: "Estágio", item: i })),
      ...provas.map((i) => ({ kind: "Prova", item: i })),
      ...tbl.map((i) => ({ kind: "TBL", item: i })),
      ...trabalhos.map((i) => ({ kind: "Trabalho", item: i })),
      ...ic.map((i) => ({ kind: "IC", item: i })),
    ];
    const today = new Date().toISOString().slice(0, 10);
    return all
      .filter((x) => x.item.date && x.item.date >= today && !x.item.done)
      .sort((a, b) => (a.item.date || "").localeCompare(b.item.date || ""))
      .slice(0, 6);
  }, [clinica, estagio, provas, tbl, trabalhos, ic]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-white">
      <Toaster richColors position="top-center" />
      <header className="border-b border-pink-100/80 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5">
          <div className="rounded-2xl bg-pink-600 p-2 text-white shadow-sm">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Agenda Odonto</h1>
            <p className="text-sm text-muted-foreground">
              Sua faculdade organizada — clínica, matérias, provas e mais.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {upcoming.length > 0 && (
          <Card className="mb-6 border-pink-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-5 w-5 text-pink-600" /> Próximos compromissos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 sm:grid-cols-2">
                {upcoming.map(({ kind, item }) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-pink-100 bg-pink-50/40 px-3 py-2"
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
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="clinica" className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-pink-100/60 p-1">
            <TabsTrigger value="clinica"><Stethoscope className="mr-1 h-4 w-4" />Clínica</TabsTrigger>
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
                { key: "conteudo", label: "Conteúdo", type: "textarea", placeholder: "Capítulos, slides..." },
                notesField,
              ]}
              renderMeta={(i) => (
                <>{i.materia && <span>{i.materia}</span>}{i.conteudo && <span> · {i.conteudo.slice(0, 60)}{i.conteudo.length > 60 ? "…" : ""}</span>}</>
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
              description="O que comprar e levar para a faculdade."
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
                notesField,
              ]}
              renderMeta={(i) => (
                <>
                  {i.categoria && <Badge variant="outline" className="mr-1">{i.categoria}</Badge>}
                  {i.quantidade && <span>{i.quantidade}</span>}
                </>
              )}
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
