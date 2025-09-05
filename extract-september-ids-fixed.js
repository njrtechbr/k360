const fs = require('fs');

const csvContent = fs.readFileSync('dados/reviews_rows (1).csv', 'utf8');

// Regex para encontrar linhas com datas de setembro
const septemberPattern = /^([a-f0-9-]+),([a-f0-9-]+),(\d+),.*,2025-09/gm;

console.log('🔍 IDs das avaliações de setembro no CSV:');

const septemberIds = [];
let match;

while ((match = septemberPattern.exec(csvContent)) !== null) {
  const id = match[1];
  const attendantId = match[2];
  const rating = match[3];
  
  console.log(`ID: ${id} | Atendente: ${attendantId} | Nota: ${rating}`);
  septemberIds.push(id);
}

console.log(`\n📊 Total de IDs de setembro: ${septemberIds.length}`);
console.log('IDs válidos:', septemberIds.filter(id => id.match(/^[a-f0-9-]+$/)));