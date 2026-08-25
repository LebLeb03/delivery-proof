import { createFileRoute } from "@tanstack/react-router";
import { AuthenticatedShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated")({ component: AuthenticatedShell });
