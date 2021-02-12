let selected = [];

const toggleSelected = (id, start, end, title, location) => {
  document.getElementById(id).classList.toggle('not-selected');
  if (selected.find(event => event.id === id)) {
    selected = selected.filter(event => event.id !== id);
  } else {
    selected.push({ id, start, end, title, location });
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
      class="event {{selected}}"
      onclick="toggleSelected('{{{id}}}', '{{{start}}}', '{{{end}}}', \`{{{summary}}}\`, '{{{location}}}')"
      id="{{{id}}}"
      data-event-name="{{{summary}}}">
        <td />
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

  const getEvents = async () => {
    eventsElem.innerHTML = displayText('Loading...');
    const events = await (
      await fetch(`/api/calendar/${date.toISOString()}`)
    ).json();
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
            const { start, end, summary, id, location } = event;
            const { backgroundColor, foregroundColor } = cal;

            eventsElem.innerHTML += eventRowTemplate({
              backgroundColor,
              foregroundColor,
              start,
              end,
              summary,
              id,
              timespan: `${formatDateForDisplay(
                start
              )} - ${formatDateForDisplay(start)}`,
              selected: selected.find(i => i.id === event.id)
                ? ''
                : 'not-selected',
              location
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

  const addSelected = () => {
    console.log(selected);
    // fetch('/events', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({ events: selected })
    // }).then(() => {
    //   window.location.href = '/';
    // });
  };

  addSelectedButton.onclick = addSelected;

  const onPageReady = () => {
    hideLoadingOverlay();
  };
  document.addEventListener('DOMContentLoaded', onPageReady);
})(window);
