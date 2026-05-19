import { createFileRoute } from "@tanstack/react-router";
import AgendaApp from "@/components/AgendaApp";

export const Route = createFileRoute("/")({
  component: AgendaApp,
});
