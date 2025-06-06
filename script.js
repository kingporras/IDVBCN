
console.log('Inter de Verdun App cargada');

function guardarConvocatoria() {
  const texto = document.getElementById('convocatoriaInput').value;
  alert('Convocatoria guardada (simulado):\n' + texto);
}

function votarMVP() {
  const nombre = document.getElementById('nombreMVP').value;
  document.getElementById('mvpResultado').innerText = 'Voto para: ' + nombre;
}


function registrarAsistencia(event) {
  event.preventDefault();
  const nombre = document.getElementById('nombreAsistente').value;
  const respuesta = document.getElementById('respuestaAsistencia').value;
  const lista = document.getElementById('listaAsistencia');

  const item = document.createElement('li');
  item.textContent = `${nombre} - ${respuesta}`;
  lista.appendChild(item);

  document.getElementById('formAsistencia').reset();
}
