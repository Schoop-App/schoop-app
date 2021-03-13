let selected = [];

const SELECTED_ITEM_HTML = '<h3><i class="las la-check-square"></i></h3>';
const UNSELECTED_ITEM_HTML = '<h3><i class="las la-stop"></i></h3>';

const toggleSelected = (id, start, end, title, location) => {
  const elem = document.getElementById(id);
  const color = elem.style.backgroundColor;
  const colorStart = color.indexOf('(') + 1;

  if (selected.find(event => event.id === id)) {
    elem.style.backgroundColor = `rgba(${color.substring(
      colorStart,
      color.length - 1
    )}, 0.7)`;
    elem.firstElementChild.innerHTML = UNSELECTED_ITEM_HTML;
    selected = selected.filter(event => event.id !== id);
  } else {
    elem.style.backgroundColor = `rgb(${color.substring(
      colorStart,
      color.length - 6
    )})`;
    elem.firstElementChild.innerHTML = SELECTED_ITEM_HTML;
    selected.push({
      id,
      start,
      end,
      title,
      location,
      color: elem.style.backgroundColor
    });
  }
};

(window => {
  let date = new Date();
  date.setHours(0, 0, 0, 0);
  const dateElem = document.getElementById('date');
  const todayButton = document.getElementById('today');
  const eventsElem = document.querySelector('#events tbody');
  const backDate = document.getElementById('back-date');
  const forwardDate = document.getElementById('forward-date');
  const addSelectedButton = document.getElementById('add-selected');

  const eventRowTemplate = Handlebars.compile(
    `<tr
      style="background-color: {{{backgroundColor}}}; color: {{{foregroundColor}}}"
      class="event"
      onclick="toggleSelected('{{{id}}}', '{{{start}}}', '{{{end}}}', \`{{{summary}}}\`, '{{{location}}}')"
      id="{{{id}}}"
      data-event-name="{{{summary}}}">
        <td>{{{selected}}}</td>
	      <td class="center" style="font-weight: 700;">{{summary}}</td>
	      <td class="right">{{timespan}}</td>
    </tr>`
  );

  const fixDate = t => {
    const temp = new Date(date);
    const time = new Date(t);
    temp.setHours(time.getHours());
    temp.setMinutes(time.getMinutes());
    temp.setSeconds(time.getSeconds());
    return temp;
  };

  const formatDateForDisplay = date =>
    date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: 'numeric'
    });

  const displayText = msg =>
    `<tr><td style="text-align: center; font-size: 1.07em;">${msg}</td></tr>`;

  const getLinkIfPresent = event => {
    if (event.location) return event.location;

    const zoomLink = event.conferenceData
      ? event.conferenceData.entryPoints.find(e => e.entryPointType === 'video')
      : null;
    if (zoomLink) return zoomLink.uri;

    return;
  };

  // From https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
  const hexToRgb = hex => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16), // r
          parseInt(result[2], 16), // g
          parseInt(result[3], 16) // b
        ]
      : null;
  };

  const getEvents = async () => {
    eventsElem.innerHTML = displayText('Loading...');
    // const events = await (
    //   await fetch(`/api/calendar/${date.toISOString()}`)
    // ).json();
    const events = await getJSON(`/calendar/${date.toISOString()}`);
    eventsElem.innerHTML = '';
    events.forEach(cal => {
      if (!cal.events.length) return;
      return (
        cal.events
          // No full-day events
          .filter(e => e.start && !e.start.date)
          // For repeating events, the stored start and end dates are incorrect
          .map(e => ({
            ...e,
            start: fixDate(e.start.dateTime),
            end: fixDate(e.end.dateTime)
          }))
          // Order by start date
          .sort((a, b) => a.start - b.start)
          .forEach(event => {
            const { start, end, summary, id } = event;
            const { backgroundColor, foregroundColor } = cal;
            const [r, g, b] = hexToRgb(backgroundColor);

            const isSelected = selected.find(i => i.id === event.id);

            eventsElem.innerHTML += eventRowTemplate({
              backgroundColor: isSelected
                ? `rgb(${r}, ${g}, ${b})`
                : `rgba(${r}, ${g}, ${b}, 0.8)`,
              foregroundColor,
              start,
              end,
              summary,
              id,
              timespan: `${formatDateForDisplay(
                start
              )} - ${formatDateForDisplay(end)}`,
              location: getLinkIfPresent(event),
              selected: isSelected ? SELECTED_ITEM_HTML : UNSELECTED_ITEM_HTML
            });
          })
      );
    });

    if (!eventsElem.innerHTML) {
      eventsElem.innerHTML = displayText('No events for that day');
    }
  };

  const displayDate = () => {
    dateElem.innerText = date.toDateString();
    getEvents();
  };
  displayDate();

  const isDateToday = () => {
    const today = date.toDateString() === new Date().toDateString();
    todayButton.disabled = today;
  };

  const changeDateBy = by => {
    date.setDate(date.getDate() + by);
    displayDate();
    isDateToday();
  };

  backDate.onclick = () => changeDateBy(-1);
  forwardDate.onclick = () => changeDateBy(1);

  const setToday = () => {
    date = new Date();
    date.setHours(0, 0, 0, 0);
    displayDate();
    todayButton.disabled = true;
  };

  todayButton.onclick = setToday;

  const addSelected = async () => {
    for (let event of selected) {
      const res = await Swal.fire({
        title: event.title,
        input: 'url',
        inputLabel: 'Zoom link for this event',
        inputValue: event.location || '',
        showDenyButton: true,
        denyButtonText: 'Leave blank'
      });

      if (res.isDismissed) {
        selected = [];
        getEvents();
        return;
      } else if (res.isConfirmed) {
        selected = selected.map(e =>
          e.id === event.id ? { ...e, location: res.value || null } : e
        );
      } else {
        selected = selected.map(e =>
          e.id === event.id ? { ...e, location: null } : e
        );
      }
    }

    const data = await postJSON('/calendar', { events: selected });

    if (data) {
      window.location.href = '/';
    } else {
      await showLostCommunicationDialog(
        'If you would like, you can reload the page to reconnect.'
      );
      // document.querySelector('.content').innerHTML = `
      // <div style="text-align: center;">
      //   <h1>Something went wrong</h1>
      //   <p>You can <a href="/calendar">reload the page</a> and try again</p>
      // </div>
      // `;
    }
  };

  addSelectedButton.onclick = addSelected;

  const onPageReady = () => {
    hideLoadingOverlay();
  };
  document.addEventListener('DOMContentLoaded', onPageReady);
})(window);
