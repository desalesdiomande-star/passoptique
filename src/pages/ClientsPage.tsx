import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/i18n/translations";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Switch } from "@/components/ui/switch";

import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  User,
  Shield,
} from "lucide-react";

import { toast } from "sonner";

const API_URL = "http://localhost:4000"; // même valeur que dans AuthContext.tsx

// NOUVEAU — le token JWT doit être envoyé sur chaque appel protégé,
// sinon requireAuth (côté serveur) répond 401 et rien ne s'affiche.
function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}


// =====================================================
// TYPE CLIENT
// =====================================================

interface Client {

  id: number;

  firstName: string;
  lastName: string;

  phone: string;
  email: string;

  city: string;

  sex: "M" | "F";

  age: number;

  notes: string;
  district: string;

  insurance: string;
  insuranceRate: number;

  isPrimaryInsured: boolean;

  cmuNumber: string;

  cabinet_id: number;
}


// =====================================================
// FORMULAIRE
// =====================================================

interface ClientForm {

  firstName: string;
  lastName: string;

  phone: string;
  email: string;

  city: string;

  sex: "M" | "F";

  age: string;

  notes: string;
  district: string;

  insurance: string;
  insuranceRate: string;

  isPrimaryInsured: boolean;

  cmuNumber: string;
}


// =====================================================
// PAGE
// =====================================================

const ClientsPage = () => {

  const { lang, user } = useAuth();

  const tr = t(lang);


  // ===================================================
  // CABINET
  // ===================================================

  const cabinetId = user?.cabinet_id;


  // ===================================================
  // STATES
  // ===================================================

  const [search, setSearch] = useState("");

  const [clients, setClients] = useState<Client[]>([]);

  const [isOpen, setIsOpen] = useState(false);

  const [loading, setLoading] = useState(true);


  // ===================================================
  // FORM
  // ===================================================

  const [form, setForm] = useState<ClientForm>({

    firstName: "",
    lastName: "",

    phone: "",
    email: "",

    city: "",

    sex: "M",

    age: "",

    notes: "",
    district: "",

    insurance: "",
    insuranceRate: "",

    isPrimaryInsured: true,

    cmuNumber: "",

  });


  // ===================================================
  // RESET FORM
  // ===================================================

  const resetForm = () => {

    setForm({

      firstName: "",
      lastName: "",

      phone: "",
      email: "",

      city: "",

      sex: "M",

      age: "",

      notes: "",
      district: "",

      insurance: "",
      insuranceRate: "",

      isPrimaryInsured: true,

      cmuNumber: "",

    });

  };


  // ===================================================
  // CHARGER CLIENTS
  // ===================================================

  useEffect(() => {

    const loadClients = async () => {

      try {

        setLoading(true);


        // ---------------------------------------------
        // vérifier cabinet
        // ---------------------------------------------

        if (!cabinetId) {

          toast.error(
            lang === "fr"
              ? "Cabinet introuvable"
              : "Cabinet not found"
          );

          setClients([]);

          return;
        }


        console.log(
          "Chargement clients cabinet :",
          cabinetId
        );


        // ---------------------------------------------
        // GET CLIENTS
        // Le cabinet est désormais déduit du token JWT côté serveur
        // (requireAuth -> req.user.cabinet_id), plus besoin du ?cabinet_id=
        // ---------------------------------------------

        const response = await fetch(
          `${API_URL}/api/clients`,
          {
            headers: authHeaders(), // NOUVEAU — sans ça, 401 systématique
          }
        );


        const data = await response.json();


        // ---------------------------------------------
        // erreur API
        // ---------------------------------------------

        if (!response.ok) {

          throw new Error(
            data.message ||
            "Erreur lors du chargement des clients"
          );

        }


        // ---------------------------------------------
        // sauvegarder
        // ---------------------------------------------

        setClients(data);

      }

      catch (error) {

        console.error(
          "Erreur chargement clients :",
          error
        );


        toast.error(

          error instanceof Error

            ? error.message

            : lang === "fr"
              ? "Impossible de charger les clients"
              : "Unable to load clients"

        );

      }

      finally {

        setLoading(false);

      }

    };


    loadClients();

  }, [cabinetId, lang]);


  // ===================================================
  // AJOUTER CLIENT
  // ===================================================

  const handleSave = async () => {

    // -----------------------------------------------
    // validation formulaire
    // -----------------------------------------------

    if (
      !form.lastName ||
      !form.firstName ||
      !form.phone
    ) {

      toast.error(

        lang === "fr"

          ? "Nom, prénom et téléphone obligatoires"

          : "Last name, first name and phone required"

      );

      return;
    }


    // -----------------------------------------------
    // vérifier cabinet
    // -----------------------------------------------

    if (!cabinetId) {

      toast.error(

        lang === "fr"
          ? "Cabinet introuvable"
          : "Cabinet not found"

      );

      return;
    }


    try {

      // ---------------------------------------------
      // POST
      // Le cabinet_id n'a plus besoin d'être envoyé dans le body :
      // le serveur le prend depuis le JWT (req.user.cabinet_id) pour
      // éviter qu'un client puisse être créé pour un autre cabinet.
      // ---------------------------------------------

      const response = await fetch(
        `${API_URL}/api/clients`,
        {

          method: "POST",

          headers: {
            "Content-Type": "application/json",
            ...authHeaders(), // NOUVEAU — sans ça, 401 systématique
          },

          body: JSON.stringify({

            firstName: form.firstName,
            lastName: form.lastName,

            phone: form.phone,
            email: form.email,

            city: form.city,

            sex: form.sex,

            age: Number(form.age) || 0,

            notes: form.notes,

            district: form.district,

            insurance: form.insurance,

            insuranceRate:
              Number(form.insuranceRate) || 0,

            isPrimaryInsured:
              form.isPrimaryInsured,

            cmuNumber:
              form.cmuNumber,

          }),

        }
      );


      const data = await response.json();


      // ---------------------------------------------
      // erreur API
      // ---------------------------------------------

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Erreur lors de l'ajout du client"
        );

      }


      // ---------------------------------------------
      // ajouter le client retourné par MySQL
      // ---------------------------------------------

      setClients((prev) => [
        data,
        ...prev,
      ]);


      // ---------------------------------------------
      // reset
      // ---------------------------------------------

      resetForm();

      setIsOpen(false);


      toast.success(
        tr.addedSuccess
      );

    }

    catch (error) {

      console.error(
        "Erreur ajout client :",
        error
      );


      toast.error(

        error instanceof Error

          ? error.message

          : lang === "fr"
            ? "Erreur lors de l'ajout du client"
            : "Error adding client"

      );

    }

  };


  // ===================================================
  // RECHERCHE
  // ===================================================

  const filtered = clients.filter(
    (client) => {

      const text = `

        ${client.firstName}
        ${client.lastName}
        ${client.phone}
        ${client.email}

      `.toLowerCase();


      return text.includes(
        search.toLowerCase()
      );

    }
  );


  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {

    return (

      <div className="flex items-center justify-center h-64">

        <p className="text-muted-foreground">

          {lang === "fr"
            ? "Chargement des clients..."
            : "Loading clients..."}

        </p>

      </div>

    );

  }


  // ===================================================
  // PAGE
  // ===================================================

  return (

    <div className="space-y-6 animate-fade-in">


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex items-center justify-between flex-wrap gap-4">

        <h1 className="text-2xl font-bold">

          {tr.clients}

        </h1>


        {/* =================================================
            DIALOG AJOUT
        ================================================= */}

        <Dialog

          open={isOpen}

          onOpenChange={(open) => {

            setIsOpen(open);

            if (!open) {
              resetForm();
            }

          }}

        >

          <DialogTrigger asChild>

            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">

              <Plus className="h-4 w-4 mr-2" />

              {tr.addClient}

            </Button>

          </DialogTrigger>


          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">

            <DialogHeader>

              <DialogTitle>

                {tr.addClient}

              </DialogTitle>

            </DialogHeader>


            <div className="grid grid-cols-2 gap-4 mt-4">


              {/* NOM */}

              <div className="space-y-2">

                <Label>
                  {tr.lastName} *
                </Label>

                <Input

                  value={form.lastName}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }

                  placeholder="Koné"

                />

              </div>


              {/* PRENOM */}

              <div className="space-y-2">

                <Label>
                  {tr.firstName} *
                </Label>

                <Input

                  value={form.firstName}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }

                  placeholder="Aminata"

                />

              </div>


              {/* TELEPHONE */}

              <div className="space-y-2">

                <Label>
                  {tr.phone} *
                </Label>

                <Input

                  value={form.phone}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }

                  placeholder="+225 07 08 09 10"

                />

              </div>


              {/* EMAIL */}

              <div className="space-y-2">

                <Label>
                  {tr.email}
                </Label>

                <Input

                  value={form.email}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }

                  placeholder="email@example.com"

                />

              </div>


              {/* VILLE */}

              <div className="space-y-2">

                <Label>
                  {tr.city}
                </Label>

                <Input

                  value={form.city}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }

                  placeholder="Abidjan"

                />

              </div>


              {/* QUARTIER */}

              <div className="space-y-2">

                <Label>
                  {tr.district}
                </Label>

                <Input

                  value={form.district}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      district: e.target.value,
                    }))
                  }

                  placeholder="Cocody"

                />

              </div>


              {/* SEXE */}

              <div className="space-y-2">

                <Label>
                  {tr.sex}
                </Label>

                <select

                  className="w-full h-10 rounded-md border border-input bg-card px-3 text-sm"

                  value={form.sex}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sex:
                        e.target.value as
                        "M" | "F",
                    }))
                  }

                >

                  <option value="M">
                    {tr.male}
                  </option>

                  <option value="F">
                    {tr.female}
                  </option>

                </select>

              </div>


              {/* AGE */}

              <div className="space-y-2">

                <Label>
                  {tr.age}
                </Label>

                <Input

                  type="number"

                  value={form.age}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      age: e.target.value,
                    }))
                  }

                  placeholder="35"

                />

              </div>


              {/* =================================================
                  ASSURANCE
              ================================================= */}

              <div className="col-span-2 border-t pt-4 mt-2">

                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">

                  <Shield className="h-4 w-4 text-primary" />

                  {tr.insurance}

                </p>

              </div>


              {/* ASSURANCE */}

              <div className="space-y-2">

                <Label>
                  {tr.insuranceName}
                </Label>

                <Input

                  value={form.insurance}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      insurance:
                        e.target.value,
                    }))
                  }

                  placeholder="MUGEFCI, CNPS, AXA..."

                />

              </div>


              {/* TAUX */}

              <div className="space-y-2">

                <Label>
                  {tr.insuranceRate}
                </Label>

                <Input

                  type="number"

                  min="0"
                  max="100"

                  value={form.insuranceRate}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      insuranceRate:
                        e.target.value,
                    }))
                  }

                  placeholder="80"

                />

              </div>


              {/* ASSURE PRINCIPAL */}

              <div className="space-y-2">

                <Label>
                  {tr.isPrimaryInsured}
                </Label>

                <div className="flex items-center gap-3 h-10">

                  <Switch

                    checked={
                      form.isPrimaryInsured
                    }

                    onCheckedChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        isPrimaryInsured:
                          value,
                      }))
                    }

                  />

                  <span className="text-sm">

                    {form.isPrimaryInsured
                      ? tr.yes
                      : tr.no}

                  </span>

                </div>

              </div>


              {/* CMU */}

              <div className="space-y-2">

                <Label>
                  {tr.cmuNumber}
                </Label>

                <Input

                  value={form.cmuNumber}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      cmuNumber:
                        e.target.value,
                    }))
                  }

                  placeholder="CMU-2024-001"

                />

              </div>


              {/* NOTES */}

              <div className="col-span-2 space-y-2">

                <Label>
                  {tr.notes}
                </Label>

                <Input

                  value={form.notes}

                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }

                  placeholder="..."

                />

              </div>


              {/* BOUTONS */}

              <div className="col-span-2 flex justify-end gap-2 mt-2">

                <Button

                  variant="outline"

                  onClick={() => {

                    setIsOpen(false);

                    resetForm();

                  }}

                >

                  {tr.cancel}

                </Button>


                <Button

                  className="bg-primary text-primary-foreground"

                  onClick={handleSave}

                >

                  {tr.save}

                </Button>

              </div>

            </div>

          </DialogContent>

        </Dialog>

      </div>


      {/* =================================================
          RECHERCHE
      ================================================= */}

      <div className="relative max-w-sm">

        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

        <Input

          placeholder={tr.searchClient}

          value={search}

          onChange={(e) =>
            setSearch(e.target.value)
          }

          className="pl-10"

        />

      </div>


      {/* =================================================
          LISTE CLIENTS
      ================================================= */}

      {filtered.length === 0 ? (

        <div className="text-center py-12">

          <User className="h-10 w-10 mx-auto text-muted-foreground mb-3" />

          <p className="text-muted-foreground">

            {search

              ? lang === "fr"
                ? "Aucun client trouvé"
                : "No client found"

              : lang === "fr"
                ? "Aucun client enregistré"
                : "No clients registered"}

          </p>

        </div>

      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {filtered.map((client) => (

            <Card

              key={client.id}

              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"

            >

              <CardContent className="p-5">

                <div className="flex items-start gap-3">


                  {/* ICON */}

                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">

                    <User className="h-5 w-5 text-primary" />

                  </div>


                  <div className="min-w-0 flex-1">


                    {/* NOM */}

                    <p className="font-semibold truncate">

                      {client.lastName}{" "}

                      {client.firstName}

                    </p>


                    {/* TELEPHONE */}

                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">

                      <Phone className="h-3 w-3" />

                      <span>
                        {client.phone}
                      </span>

                    </div>


                    {/* EMAIL */}

                    {client.email && (

                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">

                        <Mail className="h-3 w-3" />

                        <span className="truncate">

                          {client.email}

                        </span>

                      </div>

                    )}


                    {/* VILLE */}

                    {client.city && (

                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">

                        <MapPin className="h-3 w-3" />

                        <span>
                          {client.city}
                        </span>

                      </div>

                    )}


                    {/* BADGES */}

                    <div className="flex items-center gap-2 mt-2 flex-wrap">


                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">

                        {client.sex === "F"
                          ? tr.female
                          : tr.male}

                      </span>


                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">

                        {client.age}{" "}

                        {lang === "fr"
                          ? "ans"
                          : "yrs"}

                      </span>


                      {client.insurance && (

                        <span className="text-xs px-2 py-0.5 rounded-full bg-info/10 text-info flex items-center gap-1">

                          <Shield className="h-3 w-3" />

                          {client.insurance}

                          {" ("}

                          {client.insuranceRate}

                          {"%)"}

                        </span>

                      )}


                      {client.cmuNumber && (

                        <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">

                          CMU

                        </span>

                      )}

                    </div>


                    {/* NOTES */}

                    {client.notes && (

                      <p className="text-xs text-muted-foreground mt-2 italic">

                        {client.notes}

                      </p>

                    )}

                  </div>

                </div>

              </CardContent>

            </Card>

          ))}

        </div>

      )}

    </div>

  );

};


export default ClientsPage;
