import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, UsersRound } from "lucide-react";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AdminLeadersTab } from "@/components/admin/AdminLeadersTab";
import { AdminGroupsTab } from "@/components/admin/AdminGroupsTab";

export default function AdminManagement() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gerenciamento</h1>
          <p className="text-muted-foreground">
            Controle total sobre usuários, líderes e grupos
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="leaders" className="gap-2">
              <Shield className="h-4 w-4" />
              Líderes
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <UsersRound className="h-4 w-4" />
              Grupos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <AdminUsersTab />
          </TabsContent>

          <TabsContent value="leaders">
            <AdminLeadersTab />
          </TabsContent>

          <TabsContent value="groups">
            <AdminGroupsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
