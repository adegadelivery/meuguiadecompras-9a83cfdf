import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/Layout/AppLayout";
import BillsView from "@/components/Bills/BillsView";

const Bills = () => {
  return (
    <>
      <Helmet>
        <title>Contas a Pagar | Meu Guia de Compras</title>
        <meta name="description" content="Gerencie suas contas a pagar de forma simples e organizada" />
      </Helmet>
      <AppLayout>
        <BillsView isDesktop />
      </AppLayout>
    </>
  );
};

export default Bills;
