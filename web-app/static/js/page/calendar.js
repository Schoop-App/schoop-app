let selected = [];

const SELECTED_ITEM_HTML = '<h3><i class="las la-check-square"></i></h3>';
const UNSELECTED_ITEM_HTML = '<h3><i class="las la-stop"></i></h3>';

const toggleSelected = elem => {
  const id = elem.getAttribute('data-event-id');
  const calId = elem.getAttribute('data-cal-id');

  if (selected.find(event => event.id === id)) {
    elem.style.filter = "opacity(0.8)";
    elem.firstElementChild.innerHTML = UNSELECTED_ITEM_HTML;
    selected = selected.filter(event => event.id !== id);
  } else {
    elem.style.filter = "brightness(1)";
    elem.firstElementChild.innerHTML = SELECTED_ITEM_HTML;
    selected.push({ id, calId });
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
      style="background-color: {{{backgroundColor}}}; color: {{{foregroundColor}}}; filter: opacity({{opacity}})"
      class="event"
      onclick="toggleSelected(this)"
      data-event-id="{{{id}}}"
      data-cal-id="{{{calId}}}">
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

  const getEvents = async () => {
    eventsElem.innerHTML = displayText('Loading...');
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
            const { backgroundColor, foregroundColor, calId } = cal;

            const isSelected = selected.find(i => i.id === event.id);

            eventsElem.innerHTML += eventRowTemplate({
              backgroundColor,
              foregroundColor,
              summary,
              id,
              timespan: `${formatDateForDisplay(
                start
              )} - ${formatDateForDisplay(end)}`,
              selected: isSelected ? SELECTED_ITEM_HTML : UNSELECTED_ITEM_HTML,
              opacity: isSelected ? 1 : 0.8,
              calId
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
    let events = [];
    for (let event of selected) {
      const data = await getJSON(`/calendar/event/${event.calId}/${event.id}`);
      const location = getLinkIfPresent(data);
      const res = await Swal.fire({
        title: data.summary,
        input: 'url',
        inputLabel: 'Zoom link for this event',
        inputValue: location || '',
        showDenyButton: true,
        denyButtonText: 'Leave blank'
      });

      let toAdd = {
        id: data.id,
        start: fixDate(data.start.dateTime),
        end: fixDate(data.end.dateTime),
        title: data.summary,
        calId: event.calId,
        location
      };

      if (res.isDismissed) {
        selected = [];
        getEvents();
        return;
      } else if (res.isConfirmed) {
        toAdd.location = res.value || null;
      } else {
        toAdd.location = null;
      }
      events.push(toAdd);
    }
    console.log(events);

    await postJSON('/calendar', { events });

    window.location.href = '/';
  };

  addSelectedButton.onclick = addSelected;

  const onPageReady = () => {
    hideLoadingOverlay();
  };
  document.addEventListener('DOMContentLoaded', onPageReady);
})(window);
