<template>
  <main class="new-page full-bleed-page">
    <section class="new-page__hero">
      <div class="new-page__content">
        <p class="new-page__eyebrow">MapTree</p>
        <h1>Nova Página</h1>
        <p class="new-page__subtitle">
          Tela responsiva em largura total, pronta para receber o conteúdo principal do projeto.
        </p>
      </div>

      <div class="new-page__panel" aria-label="Resumo da nova página">
        <div class="new-page__stat">
          <span>Área</span>
          <strong>100%</strong>
        </div>
        <div class="new-page__stat">
          <span>Layout</span>
          <strong>Responsivo</strong>
        </div>
        <div class="new-page__stat">
          <span>Rota</span>
          <strong>/nova-pagina</strong>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.new-page {
  min-height: calc(100dvh - 64px);
  background:
    linear-gradient(120deg, rgba(26, 121, 77, 0.92), rgba(20, 67, 53, 0.92)),
    url('/icons/LogoMapTree.png') center / min(460px, 70vw) no-repeat;
  color: #ffffff;
}

.new-page__hero {
  min-height: calc(100dvh - 64px);
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
  align-items: end;
  gap: 32px;
  padding: clamp(24px, 5vw, 72px);
}

.new-page__content {
  max-width: 760px;
}

.new-page__eyebrow {
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
  color: #cfe983;
  margin-bottom: 10px;
}

.new-page h1 {
  font-size: clamp(2.4rem, 6vw, 5.5rem);
  line-height: 0.95;
  font-weight: 900;
  margin: 0;
}

.new-page__subtitle {
  max-width: 620px;
  margin-top: 18px;
  font-size: clamp(1rem, 2vw, 1.25rem);
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.84);
}

.new-page__panel {
  display: grid;
  gap: 12px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 8px;
  padding: 16px;
  backdrop-filter: blur(14px);
}

.new-page__stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
}

.new-page__stat span {
  color: rgba(255, 255, 255, 0.72);
}

.new-page__stat strong {
  font-weight: 800;
  text-align: right;
}

@media (max-width: 760px) {
  .new-page__hero {
    grid-template-columns: 1fr;
    align-content: end;
    gap: 20px;
    padding: 24px 16px;
  }
}
</style>
