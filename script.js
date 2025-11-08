document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const codesInput = document.getElementById('codesInput');
    const statusDiv = document.getElementById('status');
    const resultsTableBody = document.querySelector('#resultsTable tbody');
    const exportBtn = document.getElementById('exportBtn');

    generateBtn.addEventListener('click', async () => {
        const codes = codesInput.value.split('\n').map(c => c.trim()).filter(c => c);
        if (codes.length === 0) {
            statusDiv.textContent = 'Įveskite bent vieną prekės kodą.';
            return;
        }

        resultsTableBody.innerHTML = '';
        exportBtn.classList.add('hidden');
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generuojama...';

        let allProducts = [];
        for (let i = 0; i < codes.length; i++) {
            const code = codes[i];
            statusDiv.textContent = `Ieškoma prekė (${i + 1}/${codes.length}): ${code}`;
            const productData = await fetchProductData(code);
            allProducts.push(productData);
            updateTable(productData);
        }

        statusDiv.textContent = `Darbas baigtas. Rasta ${allProducts.filter(p => p.status === 'Rasta').length} iš ${codes.length} prekių.`;
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generuoti Sąmatą';
        if(allProducts.length > 0) {
            exportBtn.classList.remove('hidden');
        }
    });

    exportBtn.addEventListener('click', () => {
        const rows = Array.from(resultsTableBody.querySelectorAll('tr'));
        const csvContent = [
            '"Prekės kodas","Pavadinimas","Kaina, €","Būsena","Nuoroda"',
            ...rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                return cells.map(cell => `"${cell.textContent.replace(/"/g, '""')}"`).join(',');
            })
        ].join('\n');
        
        downloadCSV(csvContent);
    });

    function updateTable(product) {
        const row = resultsTableBody.insertRow();
        row.insertCell(0).textContent = product.code;
        row.insertCell(1).textContent = product.name;
        row.insertCell(2).textContent = product.price;
        row.insertCell(3).textContent = product.status;
        const linkCell = row.insertCell(4);
        if (product.link) {
            const link = document.createElement('a');
            link.href = product.link;
            link.textContent = 'Atidaryti';
            link.target = '_blank';
            linkCell.appendChild(link);
        } else {
            linkCell.textContent = '-';
        }
    }

    async function fetchProductData(code) {
        // Naudojame viešą proxy, kad išvengtume CORS problemų naršyklėje
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const searchUrl = `${proxyUrl}https://www.bkgrupe.lt/lt/search?search_query=${encodeURIComponent(code)}`;

        try {
            const response = await fetch(searchUrl);
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            
            const productLinkTag = doc.querySelector('.product_img_link');
            if (!productLinkTag) {
                return { code, name: '-', price: '-', status: 'Nerasta', link: '' };
            }

            const productUrl = productLinkTag.getAttribute('href');
            const productPageResponse = await fetch(`${proxyUrl}${encodeURIComponent(productUrl)}`);
            const productHtml = await productPageResponse.text();
            const productDoc = new DOMParser().parseFromString(productHtml, 'text/html');

            const name = productDoc.querySelector('h1[itemprop="name"]')?.textContent.trim() || 'Nerastas pavadinimas';
            const price = productDoc.querySelector('span[itemprop="price"]')?.getAttribute('content') || 'Nenurodyta';
            
            return { code, name, price, status: 'Rasta', link: productUrl };
        } catch (error) {
            console.error('Klaida ieškant prekės:', code, error);
            return { code, name: 'Klaida', price: '-', status: 'Klaida', link: '' };
        }
    }

    function downloadCSV(csvContent) {
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'samata.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
