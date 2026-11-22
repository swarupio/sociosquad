import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OverviewTab from "./OverviewTab";
import OrganizationsTab from "./OrganizationsTab";
import UsersTab from "./UsersTab";
import AuditTab from "./AuditTab";

const SECTIONS = ["overview", "organizations", "users", "audit"] as const;
type Section = (typeof SECTIONS)[number];
const isSection = (v: string | undefined): v is Section => !!v && (SECTIONS as readonly string[]).includes(v);

const Admin = () => {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const active: Section = isSection(section) ? section : "overview";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 pt-24 pb-16 max-w-7xl">
        <h1 className="text-3xl font-display font-bold text-foreground mb-6">Admin</h1>
        <Tabs value={active} onValueChange={(v) => navigate(`/admin/${v}`)}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="organizations"><OrganizationsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="audit"><AuditTab /></TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
