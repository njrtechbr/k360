const fs = require('fs');

const csvContent = fs.readFileSync('dados/reviews_rows (1).csv', 'utf8');
const lines = csvContent.split('\n');

console.log('🔍 IDs das avaliações de setembro no CSV:');

const septemberIds = [];
lines.forEach((line, index) => {
  if (line.includes('2025-09')) {
    const parts = line.split(',');
    const id = parts[0];
    const date = parts[4];
    console.log(`${index}: ${id} - ${date}`);
    septemberIds.push(id);
  }
});

console.log(`\n📊 Total de IDs de setembro: ${septemberIds.length}`);
console.log('IDs:', septemberIds);