import VehicleForm from "@/components/VehicleForm";

export default function VehiclePage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10">
      <section className="mx-auto w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Add Vehicle</h1>
        <VehicleForm />
      </section>
    </main>
  );
}
