import { redirect } from "next/navigation";

/** O álbum agora fica dentro de "Mudar visual", no perfil. */
export default function Colecao() {
  redirect("/aluno/perfil#visual");
}
