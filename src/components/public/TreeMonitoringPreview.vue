<template>
  <figure class="monitor-preview">
    <div class="monitor-map">
      <svg
        class="map-art"
        viewBox="0 0 760 440"
        role="img"
        aria-labelledby="map-title map-description"
        preserveAspectRatio="xMidYMid slice"
      >
        <title id="map-title">Mapa esquemático de árvores próximas à fiação</title>
        <desc id="map-description">
          Ruas, copas de árvores e uma linha de fiação em uma representação visual fictícia.
        </desc>
        <rect width="760" height="440" fill="#e9efe5" />
        <path
          d="M0 0h188l-44 91H0zm574 0h186v120l-89-27zM0 330l118-38 86 148H0zm559 148 67-122 134 42v80z"
          fill="#d7e5d2"
        />
        <path
          d="M-38 124c113 8 167 29 249 18s123-53 208-34 151 40 231 20 105-45 158-39"
          fill="none"
          stroke="#fff"
          stroke-width="52"
        />
        <path
          d="M-30 336c129-65 226-66 303-37s147 38 227-9 144-57 293-51"
          fill="none"
          stroke="#fff"
          stroke-width="45"
        />
        <path
          d="M250-30c-17 89-2 133 28 184s43 116 20 319"
          fill="none"
          stroke="#fff"
          stroke-width="35"
        />
        <path
          d="M550-24c-32 95-22 160 13 214s55 121 39 273"
          fill="none"
          stroke="#fff"
          stroke-width="34"
        />
        <path
          d="M-38 124c113 8 167 29 249 18s123-53 208-34 151 40 231 20 105-45 158-39M-30 336c129-65 226-66 303-37s147 38 227-9 144-57 293-51"
          fill="none"
          stroke="#d1d8d1"
          stroke-width="2"
        />
        <path
          d="M44 46 691 396"
          fill="none"
          stroke="#45585a"
          stroke-width="2"
          stroke-dasharray="8 7"
        />
        <path
          d="M44 46 691 396"
          fill="none"
          stroke="#f1b84b"
          stroke-width="4"
          stroke-dasharray="2 13"
          stroke-linecap="round"
        />
        <g stroke="#405d45" stroke-width="2">
          <g transform="translate(177 130)">
            <path d="M0 15v22" stroke-width="4" />
            <circle r="23" fill="#73a968" />
            <circle cx="-14" cy="-3" r="13" fill="#84b879" stroke="none" />
            <circle cx="13" cy="-4" r="14" fill="#5e9c58" stroke="none" />
            <circle cx="0" cy="-13" r="13" fill="#8dbd79" stroke="none" />
          </g>
          <g transform="translate(383 241)">
            <path d="M0 16v27" stroke-width="4" />
            <circle r="25" fill="#73a968" />
            <circle cx="-14" cy="-3" r="14" fill="#84b879" stroke="none" />
            <circle cx="14" cy="-4" r="14" fill="#5e9c58" stroke="none" />
            <circle cx="0" cy="-15" r="13" fill="#8dbd79" stroke="none" />
          </g>
          <g transform="translate(569 309)">
            <path d="M0 16v24" stroke-width="4" />
            <circle r="23" fill="#73a968" />
            <circle cx="-14" cy="-3" r="13" fill="#84b879" stroke="none" />
            <circle cx="13" cy="-4" r="14" fill="#5e9c58" stroke="none" />
            <circle cx="0" cy="-13" r="13" fill="#8dbd79" stroke="none" />
          </g>
        </g>
        <g fill="#fff" stroke="#087344" stroke-width="3">
          <circle cx="177" cy="130" r="6" />
          <circle cx="383" cy="241" r="6" />
          <circle cx="569" cy="309" r="6" />
        </g>
      </svg>
      <div class="map-label map-label--one">Árvore mapeada</div>
      <div class="map-label map-label--two">Referência da rede</div>
      <div class="map-legend">
        <span><i class="legend-tree" aria-hidden="true"></i>Árvores</span>
        <span><i class="legend-wire" aria-hidden="true"></i>Fiação de referência</span>
      </div>
    </div>

    <figcaption class="monitor-details">
      <div class="details-heading">
        <h3>Acompanhamento em um só lugar.</h3>
        <p>Exemplo visual com informações ilustrativas.</p>
      </div>
      <ul class="monitor-list">
        <li>
          <span class="list-mark list-mark--green" aria-hidden="true"></span>
          <span><strong>Localização</strong><small>Árvore associada ao mapa</small></span>
          <span class="list-status">Inventário</span>
        </li>
        <li>
          <span class="list-mark list-mark--lime" aria-hidden="true"></span>
          <span><strong>Medições</strong><small>Dados registrados em campo</small></span>
          <span class="list-status">Histórico</span>
        </li>
        <li>
          <span class="list-mark list-mark--blue" aria-hidden="true"></span>
          <span
            ><strong>Referência da fiação</strong><small>Confirmar condições no local</small></span
          >
          <span class="list-status">Vistoria</span>
        </li>
      </ul>
      <p class="monitor-disclaimer">
        O desenho não representa uma medição real nem determina a segurança da rede.
      </p>
    </figcaption>
  </figure>
</template>

<style scoped>
.monitor-preview {
  overflow: hidden;
  border-radius: 22px;
  background: var(--mt-surface);
  box-shadow: 0 28px 72px rgb(12 55 36 / 12%);
}

.monitor-map {
  min-height: 430px;
  position: relative;
  overflow: hidden;
  background: #e9efe5;
}

.map-art {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  display: block;
}

.map-label {
  position: absolute;
  padding: 6px 10px;
  border-radius: 999px;
  color: #173822;
  background: #fff;
  box-shadow: 0 5px 15px rgb(18 39 25 / 15%);
  font-size: 0.7rem;
  font-weight: 700;
}

.map-label--one {
  top: 27%;
  left: 17%;
}

.map-label--two {
  right: 14%;
  bottom: 19%;
}

.map-legend {
  position: absolute;
  right: 18px;
  bottom: 16px;
  display: flex;
  gap: 16px;
  padding: 9px 12px;
  border-radius: 9px;
  color: #24332a;
  background: #fff;
  box-shadow: 0 5px 15px rgb(18 39 25 / 12%);
  font-size: 0.7rem;
}

.map-legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.legend-tree,
.legend-wire {
  width: 8px;
  height: 8px;
  display: inline-block;
  border-radius: 50%;
  background: #087344;
}

.legend-wire {
  width: 15px;
  height: 2px;
  border-radius: 0;
  background: #e9aa36;
}

.monitor-details {
  padding: 30px 34px 25px;
}

.details-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 19px;
  border-bottom: 1px solid var(--mt-border);
}

.details-heading h3 {
  color: var(--mt-forest);
  font-family: 'K2D', 'Poppins', sans-serif;
  font-size: 1.16rem;
  font-weight: 700;
}

.details-heading p {
  color: var(--mt-text-muted);
  font-size: 0.7rem;
}

.monitor-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.monitor-list li {
  min-height: 70px;
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--mt-border);
}

.list-mark {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.list-mark--green {
  background: #087344;
}

.list-mark--lime {
  background: #9dbb2c;
}

.list-mark--blue {
  background: #4b83ba;
}

.monitor-list li > span:nth-child(2) {
  display: grid;
  gap: 3px;
}

.monitor-list strong {
  color: var(--mt-forest);
  font-size: 0.79rem;
  font-weight: 700;
}

.monitor-list small {
  color: var(--mt-text-muted);
  font-size: 0.7rem;
}

.list-status {
  color: var(--mt-text-muted);
  font-size: 0.7rem;
}

.monitor-disclaimer {
  margin-top: 15px;
  color: var(--mt-text-muted);
  font-size: 0.7rem;
  line-height: 1.55;
}

@media (max-width: 700px) {
  .monitor-preview {
    border-radius: 16px;
  }

  .monitor-map {
    min-height: 285px;
  }

  .map-label {
    padding: 5px 8px;
    font-size: 0.7rem;
  }

  .map-label--one {
    top: 25%;
    left: 13%;
  }

  .map-label--two {
    right: 8%;
    bottom: 19%;
  }

  .map-legend {
    right: 10px;
    bottom: 10px;
    gap: 10px;
    padding: 7px 9px;
    font-size: 0.7rem;
  }

  .monitor-details {
    padding: 22px 18px 20px;
  }

  .details-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .details-heading h3 {
    font-size: 1.02rem;
  }

  .details-heading p,
  .monitor-disclaimer {
    font-size: 0.7rem;
  }

  .monitor-list li {
    grid-template-columns: 10px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .monitor-list strong {
    font-size: 0.72rem;
  }

  .monitor-list small,
  .list-status {
    font-size: 0.7rem;
  }
}
</style>
