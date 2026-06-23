// Mock _BAPI.t if not available
window._BAPI = window._BAPI || { t: () => console.log('Mock _BAPI.t called') };

const content = document.querySelector('#content');
const subheading = document.querySelector('#subheading');
const viewing = document.querySelector('#viewing');
const listHeading = document.querySelector('#list-heading');
const breadcrumbs = document.querySelector('#breadcrumbs');
const searchArea = document.querySelector('#search-area');
const searchNavTop = document.querySelector('#search-nav-top');
const searchNavBottom = document.querySelector('#search-nav-bottom');
const searchButtonElement = document.querySelector('#search-button');
const searchInput = document.querySelector('#search-input');

function getParameterByName(name) {
  const url = window.location.hash.slice(1) || '/';
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec('?' + url.split('?')[1] || '');
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function makeApiRequest(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = false;
    xhr.addEventListener('readystatechange', function () {
      if (this.readyState === this.DONE) {
        if (this.status === 200) {
          const response = JSON.parse(this.responseText);
          console.log('API Response:', response);
          window._BAPI.t(response.meta?.fumsId || 'no-fumsId');
          resolve(response.data);
        } else {
          console.error('API Error:', this.status, this.statusText);
          reject(`HTTP ${this.status}: ${this.statusText}`);
        }
      }
    });
    xhr.open('GET', url);
    xhr.setRequestHeader('api-key', API_KEY); // Uses global API_KEY from my_key.js
    xhr.onerror = () => {
      console.error('Network Error:', xhr.statusText);
      reject('Network error occurred');
    };
    xhr.send();
  });
}

function getBibleVersions() {
  return makeApiRequest('https://api.scripture.api.bible/v1/bibles');
}

function getBooks(bibleVersionID) {
  return makeApiRequest(`https://api.scripture.api.bible/v1/bibles/${bibleVersionID}/books`);
}

function getChapters(bibleVersionID, bookID) {
  return makeApiRequest(`https://api.scripture.api.bible/v1/bibles/${bibleVersionID}/books/${bookID}/chapters`);
}

function getVerses(bibleVersionID, chapterID) {
  return makeApiRequest(`https://api.scripture.api.bible/v1/bibles/${bibleVersionID}/chapters/${chapterID}/verses`);
}

function getSelectedVerse(bibleVersionID, bibleVerseID) {
  return makeApiRequest(
    `https://api.scripture.api.bible/v1/bibles/${bibleVersionID}/verses/${bibleVerseID}?include-chapter-numbers=false&include-verse-numbers=false`
  );
}

function getSearchResults(bibleVersionID, query, page = 1) {
  if (!query.trim()) {
    return Promise.reject('Search query cannot be empty');
  }
  return makeApiRequest(
    `https://api.scripture.api.bible/v1/bibles/${bibleVersionID}/search?query=${encodeURIComponent(query.trim())}&page=${page}`
  );
}

function searchButton() {
  const bibleVersionID = getParameterByName('version');
  const abbreviation = getParameterByName('abbr');
  const query = searchInput.value;
  if (query && bibleVersionID && abbreviation) {
    window.location.hash = `#/search?version=${bibleVersionID}&abbr=${abbreviation}&query=${encodeURIComponent(query.trim())}`;
  } else {
    alert('Please select a Bible version and enter a search query.');
  }
}

// Attach event listeners
searchButtonElement.addEventListener('click', searchButton);
searchInput.addEventListener('keydown', (event) => {
  if (event.keyCode === 13) {
    searchButton();
  }
});

function renderPage() {
  const path = window.location.hash.slice(1) || '/';
  const route = path.split('?')[0];
  const bibleVersionID = getParameterByName('version');
  const abbreviation = getParameterByName('abbr');
  const bookID = getParameterByName('book');
  const chapterID = getParameterByName('chapter');
  const verseID = getParameterByName('verse');
  const query = getParameterByName('query');
  const page = parseInt(getParameterByName('page')) || 1;

  content.className = 'grid gap-4';
  searchArea.style.display = 'none';
  searchNavTop.style.display = 'none';
  searchNavBottom.style.display = 'none';
  listHeading.textContent = '';
  subheading.textContent = '';
  viewing.textContent = '';
  breadcrumbs.innerHTML = '';
  content.innerHTML = '<p class="text-center text-gray-600">Loading...</p>';

  if (route === '/' || route === '') {
    subheading.textContent = 'Choose a';
    viewing.textContent = 'Bible Version';
    listHeading.textContent = 'Available Bible Versions';
    getBibleVersions().then(versions => {
      if (!versions.length) {
        content.innerHTML = '<p class="text-center text-gray-600">No Bible versions available.</p>';
        return;
      }
      let html = '';
      versions.forEach(version => {
        html += `
          <a href="#/book?version=${version.id}&abbr=${version.abbreviation}" class="block bg-white p-4 rounded-lg shadow hover:shadow-md transition">
            ${version.name} (${version.abbreviation})
          </a>
        `;
      });
      content.innerHTML = html;
    }).catch(error => {
      content.innerHTML = `<p class="text-red-600 text-center">Error loading Bible versions: ${error}</p>`;
    });
  } else if (route === '/book') {
    if (!bibleVersionID || !abbreviation) {
      window.location.hash = '#/';
      return;
    }
    searchArea.style.display = 'flex';
    subheading.textContent = 'Select a';
    viewing.textContent = abbreviation;
    listHeading.textContent = 'Books of the Bible';
    breadcrumbs.innerHTML = `
      <nav class="flex">
        <a href="#/" class="text-blue-600 hover:underline">Home</a>
        <span class="mx-2">/</span>
        <span>${abbreviation}</span>
      </nav>
    `;
    getBooks(bibleVersionID).then(books => {
      if (!books.length) {
        content.innerHTML = '<p class="text-center text-gray-600">No books available.</p>';
        return;
      }
      let html = '';
      books.forEach(book => {
        html += `
          <a href="#/chapter?version=${bibleVersionID}&abbr=${abbreviation}&book=${book.id}" class="block bg-white p-4 rounded-lg shadow hover:shadow-md transition">
            ${book.name}
          </a>
        `;
      });
      content.innerHTML = html;
    }).catch(error => {
      content.innerHTML = `<p class="text-red-600 text-center">Error loading books: ${error}</p>`;
    });
  } else if (route === '/chapter') {
    if (!bibleVersionID || !abbreviation || !bookID) {
      window.location.hash = '#/';
      return;
    }
    searchArea.style.display = 'flex';
    subheading.textContent = 'Viewing:';
    viewing.textContent = abbreviation;
    listHeading.textContent = 'Chapters';
    content.className = 'grid gap-4 grid-cols-2 sm:grid-cols-4';
    breadcrumbs.innerHTML = `
      <nav class="flex">
        <a href="#/" class="text-blue-600 hover:underline">Home</a>
        <span class="mx-2">/</span>
        <a href="#/book?version=${bibleVersionID}&abbr=${abbreviation}" class="text-blue-600 hover:underline">${abbreviation}</a>
        <span class="mx-2">/</span>
        <span>${bookID}</span>
      </nav>
    `;
    getChapters(bibleVersionID, bookID).then(chapters => {
      if (!chapters.length) {
        content.innerHTML = '<p class="text-center text-gray-600">No chapters available.</p>';
        return;
      }
      let html = '';
      chapters.forEach(chapter => {
        html += `
          <a href="#/verse?version=${bibleVersionID}&abbr=${abbreviation}&chapter=${chapter.id}" class="block bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            ${chapter.number}
          </a>
        `;
      });
      content.innerHTML = html;
    }).catch(error => {
      content.innerHTML = `<p class="text-red-600 text-center">Error loading chapters: ${error}</p>`;
    });
  } else if (route === '/verse') {
    if (!bibleVersionID || !abbreviation || !chapterID) {
      window.location.hash = '#/';
      return;
    }
    searchArea.style.display = 'flex';
    subheading.textContent = 'Viewing:';
    viewing.textContent = abbreviation;
    listHeading.textContent = 'Verses';
    content.className = 'grid gap-4 grid-cols-2 sm:grid-cols-4';
    const book = chapterID.split('.')[0];
    breadcrumbs.innerHTML = `
      <nav class="flex">
        <a href="#/" class="text-blue-600 hover:underline">Home</a>
        <span class="mx-2">/</span>
        <a href="#/book?version=${bibleVersionID}&abbr=${abbreviation}" class="text-blue-600 hover:underline">${abbreviation}</a>
        <span class="mx-2">/</span>
        <a href="#/chapter?version=${bibleVersionID}&abbr=${abbreviation}&book=${book}" class="text-blue-600 hover:underline">${book}</a>
        <span class="mx-2">/</span>
        <span>${chapterID.split('.')[1]}</span>
      </nav>
    `;
    getVerses(bibleVersionID, chapterID).then(verses => {
      if (!verses.length) {
        content.innerHTML = '<p class="text-center text-gray-600">No verses available.</p>';
        return;
      }
      let html = '';
      verses.forEach(verse => {
        html += `
          <a href="#/verse-selected?version=${bibleVersionID}&abbr=${abbreviation}&verse=${verse.id}" class="block bg-white p-4 rounded-lg shadow hover:shadow-md transition text-center">
            ${verse.reference.split(' ').pop()}
          </a>
        `;
      });
      content.innerHTML = html;
    }).catch(error => {
      content.innerHTML = `<p class="text-red-600 text-center">Error loading verses: ${error}</p>`;
    });
  } else if (route === '/verse-selected') {
    if (!bibleVersionID || !abbreviation || !verseID) {
      window.location.hash = '#/';
      return;
    }
    subheading.textContent = 'Verse:';
    content.className = 'bg-white p-6 rounded-lg shadow';
    let [book, chapter, verse] = verseID.split('.');
    if (verseID.includes('-')) {
      verse = verseID.split('-').shift().split('.').pop() + '-' + verseID.split('-').pop().split('.').pop();
    }
    breadcrumbs.innerHTML = `
      <nav class="flex">
        <a href="#/" class="text-blue-600 hover:underline">Home</a>
        <span class="mx-2">/</span>
        <a href="#/book?version=${bibleVersionID}&abbr=${abbreviation}" class="text-blue-600 hover:underline">${abbreviation}</a>
        <span class="mx-2">/</span>
        <a href="#/chapter?version=${bibleVersionID}&abbr=${abbreviation}&book=${book}" class="text-blue-600 hover:underline">${book}</a>
        <span class="mx-2">/</span>
        <a href="#/verse?version=${bibleVersionID}&abbr=${abbreviation}&chapter=${book}.${chapter}" class="text-blue-600 hover:underline">${chapter}</a>
        <span class="mx-2">/</span>
        <span>${verse}</span>
      </nav>
    `;
    getSelectedVerse(bibleVersionID, verseID).then(({ content: verseContent, reference }) => {
      viewing.innerHTML = `<i>${reference}</i>`;
      content.innerHTML = `<div class="text-lg leading-relaxed">${verseContent}</div>`;
    }).catch(error => {
      content.innerHTML = `<p class="text-red-600 text-center">Error loading verse: ${error}</p>`;
    });
  } else if (route === '/search') {
    if (!bibleVersionID || !abbreviation || !query) {
      window.location.hash = '#/';
      return;
    }
    searchArea.style.display = 'flex';
    subheading.textContent = 'Search Results for:';
    viewing.textContent = `"${query}" in ${abbreviation}`;
    content.className = 'grid gap-4';
    breadcrumbs.innerHTML = `
      <nav class="flex">
        <a href="#/" class="text-blue-600 hover:underline">Home</a>
        <span class="mx-2">/</span>
        <a href="#/book?version=${bibleVersionID}&abbr=${abbreviation}" class="text-blue-600 hover:underline">${abbreviation}</a>
        <span class="mx-2">/</span>
        <span>Search: ${query}</span>
      </nav>
    `;
    getSearchResults(bibleVersionID, query, page).then(data => {
      const verses = data.verses || [];
      const pagination = data.pagination || { page: 1, pages: 1 };
      if (!verses.length) {
        content.innerHTML = '<p class="text-center text-gray-600">No results found for this query.</p>';
        return;
      }
      let html = '';
      verses.forEach(result => {
        html += `
          <a href="#/verse-selected?version=${bibleVersionID}&abbr=${abbreviation}&verse=${result.id}" class="block bg-white p-4 rounded-lg shadow hover:shadow-md transition">
            <strong>${result.reference}</strong>: ${result.text}
          </a>
        `;
      });
      content.innerHTML = html;
      let navHtml = '';
      if (pagination.pages > 1) {
        navHtml = `<span class="text-gray-600">Page ${pagination.page} of ${pagination.pages}</span>`;
        if (pagination.page > 1) {
          navHtml += `<a href="#/search?version=${bibleVersionID}&abbr=${abbreviation}&query=${encodeURIComponent(query)}&page=${pagination.page - 1}" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Previous</a>`;
        }
        if (pagination.page < pagination.pages) {
          navHtml += `<a href="#/search?version=${bibleVersionID}&abbr=${abbreviation}&query=${encodeURIComponent(query)}&page=${pagination.page + 1}" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Next</a>`;
        }
      }
      searchNavTop.innerHTML = navHtml;
      searchNavBottom.innerHTML = navHtml;
      searchNavTop.style.display = navHtml ? 'flex' : 'none';
      searchNavBottom.style.display = navHtml ? 'flex' : 'none';
    }).catch(error => {
      content.innerHTML = `<p class="text-red-600 text-center">Error loading search results: ${error}</p>`;
    });
  }
}

window.addEventListener('hashchange', renderPage);
window.addEventListener('load', renderPage);