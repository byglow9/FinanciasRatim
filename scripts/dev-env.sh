# Ativa o ambiente de desenvolvimento do projeto (Node 22.23.5 + JRE 21).
# Uso: source scripts/dev-env.sh   (ou: . ./scripts/dev-env.sh)
# Nao executar isolado: precisa alterar o shell atual.

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
else
  echo "dev-env: nvm nao encontrado em $NVM_DIR. Instale o nvm e rode: nvm install 22.23.5" >&2
  return 1
fi

nvm use 22.23.5 >/dev/null 2>&1 || {
  echo "dev-env: Node 22.23.5 nao instalado. Rode: nvm install 22.23.5" >&2
  return 1
}

export PATH="$HOME/.local/jdk/current/bin:$PATH"

case "$(node --version)" in
  v22.23.*) ;;
  *)
    echo "dev-env: esperado Node v22.23.x, obtido $(node --version)" >&2
    return 1
    ;;
esac

JAVA_MAJOR="$(java -version 2>&1 | sed -n '1s/.*version "\([0-9]*\).*/\1/p')"
if [ -z "$JAVA_MAJOR" ] || [ "$JAVA_MAJOR" -lt 21 ]; then
  echo "dev-env: JRE 21 ou superior nao encontrado em \$HOME/.local/jdk/current (os emuladores do Firebase precisam dele)" >&2
  unset JAVA_MAJOR
  return 1
fi
unset JAVA_MAJOR
