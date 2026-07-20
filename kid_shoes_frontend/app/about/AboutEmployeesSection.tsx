import Image from "next/image";
import { isCdnMediaUrl } from "@/app/lib/api";
import { getEmployeesPhotoUrl } from "@/app/lib/about-media";

export default function AboutEmployeesSection() {
  const photoUrl = getEmployeesPhotoUrl();
  if (!photoUrl) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Наша команда</h2>
      <p className="text-sm text-gray-500 mb-4">
        Ми з радістю допоможемо підібрати зручне взуття для вашої дитини.
      </p>
      <div className="overflow-hidden rounded-xl shadow-sm">
        <Image
          src={photoUrl}
          alt="Команда магазину ТАК і ТАК"
          width={900}
          height={1200}
          unoptimized={isCdnMediaUrl(photoUrl)}
          className="h-auto w-full object-cover"
          sizes="(max-width: 768px) 100vw, 672px"
        />
      </div>
    </section>
  );
}
