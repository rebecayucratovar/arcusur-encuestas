-- GENERADO por database/catalogo/generar_sql.py. No editar a mano:
-- modificar titulados.json / empleadores.json y volver a generar.
-- Se ejecuta completo o no se aplica nada (un solo bloque DO).
do $catalogo$
declare
  v_version  uuid;
  v_status   text;
  v_section  uuid;
  v_question uuid;
begin
  -- ===================== titulados v1 =====================
  select sv.id, sv.status into v_version, v_status
    from tss_survey_versions sv join tss_surveys s on s.id = sv.survey_id
   where s.slug = 'titulados' and sv.version_number = 1;
  if v_version is null then raise exception 'No existe titulados v1'; end if;
  if v_status <> 'draft' then raise exception 'titulados v1 no está en draft (%)', v_status; end if;
  if exists (select 1 from tss_submissions where survey_version_id = v_version) then
    raise exception 'titulados v1 ya tiene envíos: no se regenera el catálogo';
  end if;

  delete from tss_question_options where question_id in (
    select q.id from tss_questions q join tss_sections se on se.id = q.section_id
     where se.survey_version_id = v_version);
  delete from tss_questions where section_id in
    (select id from tss_sections where survey_version_id = v_version);
  delete from tss_sections where survey_version_id = v_version;

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'Datos generales', null, 1)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'edad', 'Edad que tiene actualmente:', null,
          'single_choice', true, 1,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "widget": "dropdown"}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, '15_18', '15 - 18 años', 1),
    (v_question, '19_22', '19 - 22 años', 2),
    (v_question, '23_26', '23 - 26 años', 3),
    (v_question, '27_30', '27 - 30 años', 4),
    (v_question, '31_34', '31 - 34 años', 5),
    (v_question, '35_mas', '35 años o más', 6);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'genero', 'Género:', null,
          'single_choice', true, 2,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "widget": "dropdown"}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'hombre', 'Hombre', 1),
    (v_question, 'mujer', 'Mujer', 2);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'formacion', 'Posterior a sus estudios de pregrado en Ingeniería en Sistemas, ¿Ha realizado o se encuentra realizando algún programa de formación complementaria? (programas de posgrado, diplomados, doble titulación por diplomado, especializaciones, etc)', null,
          'single_choice', true, 3,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'si', 'SI', 1),
    (v_question, 'no', 'NO', 2);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'nivel_formacion', '¿CUÁL ES EL PROGRAMA DE FORMACIÓN COMPLEMENTARIA DE MAYOR NIVEL QUE HA CONCLUIDO O QUE SE ENCUENTRA REALIZANDO?', null,
          'single_choice', true, 4,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "formacion", "eq": "si"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'diplomado', 'DIPLOMADO', 1),
    (v_question, 'especialidad', 'ESPECIALIDAD', 2),
    (v_question, 'maestria', 'MAESTRIA', 3),
    (v_question, 'doctorado', 'DOCTORADO', 4),
    (v_question, 'posdoctorado', 'POS DOCTORADO', 5);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'donde_programa', '¿DONDE HA CURSADO EL PROGRAMA INDICADO?', null,
          'single_choice', true, 5,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "formacion", "eq": "si"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'eupg', 'ESCUELA UNIVERSITARIA DE POSGRADO (EUPG)', 1),
    (v_question, 'posgrado_fcyt', 'DIRECCIÓN DE POSGRADO FCyT', 2),
    (v_question, 'ibnorca', 'IBNORCA', 3),
    (v_question, 'univ_internacionales', 'UNIVERSIDADES INTERNACIONALES', 4),
    (v_question, 'univ_publicas_nacionales', 'UNIVERSIDADES PÚBLICAS NACIONALES', 5),
    (v_question, 'univ_privadas_nacionales', 'UNIVERSIDADES PRIVADAS NACIONALES', 6),
    (v_question, 'otro', 'OTRO', 7);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'financiamiento', '¿CUÁL FUE LA FUENTE DE FINANCIAMIENTO PARA CURSAR EL PROGRAMA INDICADO?', null,
          'single_choice', true, 6,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "formacion", "eq": "si"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'recursos_propios', 'FINANCIADO CON RECURSOS PROPIOS', 1),
    (v_question, 'beca_total', 'TOTAL FINANCIAMIENTO POR MEDIO DE UNA BECA', 2),
    (v_question, 'beca_parcial', 'FINANCIADO PARCIALMENTE POR MEDIO DE UNA BECA', 3);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'nombre_programa', 'INDIQUE EL NOMBRE DEL PROGRAMA', null,
          'short_text', false, 7,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "formacion", "eq": "si"}'::jsonb)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'interes_posgrado', '¿ESTARÍA INTERESADO EN REALIZAR ESTUDIOS EN ALGÚN PROGRAMA DE POSGRADO DENTRO DE LAS ÁREAS DE LA INGENIERÍA EN SISTEMAS?', null,
          'single_choice', true, 8,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'si', 'SI', 1),
    (v_question, 'no', 'NO', 2);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'area_posgrado', '¿EN CUÁL DE LAS SIGUIENTES ÁREAS LE INTERESARÍA REALIZAR EL PROGRAMA?', null,
          'single_choice', true, 9,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "interes_posgrado", "eq": "si"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'ia', 'IA', 1),
    (v_question, 'robotica', 'Robótica', 2),
    (v_question, 'ing_software', 'Ingenieria de Software', 3),
    (v_question, 'base_datos', 'Base de Datos', 4),
    (v_question, 'redes_seguridad', 'Redes de Datos y Seguridad', 5);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'organizacion_posgrado', 'EN CASO DE REALIZAR UN ESTUDIO DE POSGRADO ¿EN QUÉ ORGANIZACIÓN EDUCATIVA OPTARÍA POR REALIZAR SUS ESTUDIOS DE POSGRADO?', null,
          'single_choice', true, 10,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "interes_posgrado", "eq": "si"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'eupg', 'ESCUELA UNIVERSITARIA DE POSGRADO (EUPG)', 1),
    (v_question, 'posgrado_fcyt', 'DIRECCIÓN DE POSGRADO FCyT', 2),
    (v_question, 'ibnorca', 'IBNORCA', 3),
    (v_question, 'univ_internacionales', 'UNIVERSIDADES INTERNACIONALES', 4),
    (v_question, 'univ_publicas_nacionales', 'UNIVERSIDADES PÚBLICAS NACIONALES', 5),
    (v_question, 'univ_privadas_nacionales', 'UNIVERSIDADES PRIVADAS NACIONALES', 6),
    (v_question, 'otro', 'OTRO', 7);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'opinion_posgrado_fcyt', '¿Considera que existen programas de formación de posgrado ofertados en la Dirección de Posgrado de la FCyT que son afines a las áreas de especialidad de un Ingeniero en Sistemas?', null,
          'likert', true, 11,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": "Confirmado en el formulario: se muestra tanto con interes_posgrado=SI como NO.", "scores": {"totalmente_desacuerdo": 1, "en_desacuerdo": 2, "de_acuerdo": 3, "totalmente_acuerdo": 4}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_desacuerdo', 'Totalmente en desacuerdo', 1),
    (v_question, 'en_desacuerdo', 'En desacuerdo', 2),
    (v_question, 'de_acuerdo', 'De acuerdo', 3),
    (v_question, 'totalmente_acuerdo', 'Totalmente de Acuerdo', 4);

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'Vida profesional', null, 2)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'anios_profesional', '¿CUÁNTOS SON LOS AÑOS DE VIDA PROFESIONAL QUE LLEVA HASTA LA FECHA?', 'Introduzca solo un número sin espacios por delante o detrás de este',
          'short_text', true, 1,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "input": "integer", "min": 0, "max": 60}'::jsonb,
          null)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'anios_desempleado', 'DE LA CANTIDAD DE TIEMPO RESPONDIDA EN LA PREGUNTA ANTERIOR, ¿QUÉ CANTIDAD CORRESPONDE AL TOTAL DE TIEMPO EN QUE SE HA ENCONTRADO DESEMPLEADO?', 'Introduzca solo un número sin espacios por delante o detrás de este',
          'short_text', true, 2,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "input": "integer", "min": 0, "max_question": "anios_profesional"}'::jsonb,
          null)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'situacion_laboral', '¿CUÁL DE LAS SIGUIENTES AFIRMACIONES DESCRIBE SU SITUACIÓN LABORAL ACTUAL?', null,
          'single_choice', true, 3,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": "La etiqueta conserva la errata del formulario (''un una'') para que coincida con el CSV exportado."}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'trabaja', 'Actualmente me encuentro trabajando un una organización', 1),
    (v_question, 'no_trabaja', 'Actualmente NO trabajo', 2),
    (v_question, 'emprende', 'Actualmente dedico mi tiempo COMPLETO a un emprendimiento propio', 3);

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'Empleo actual', null, 3)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'nombre_empresa', 'Nombre de la empresa u organización donde trabaja actualmente:', null,
          'short_text', false, 1,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'rubro_trabajo', '¿CUÁL ES EL RUBRO DE LA ORGANIZACIÓN DONDE TRABAJA ACTUALMENTE?', null,
          'single_choice', false, 2,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "other_question": "otro_rubro", "require_one_of": ["rubro_trabajo", "otro_rubro"]}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'telecomunicaciones', 'Telecomunicaciones', 1),
    (v_question, 'educacion', 'Educación', 2),
    (v_question, 'desarrollo_software', 'Desarrollo de Software', 3),
    (v_question, 'redes', 'Redes de Computadoras', 4),
    (v_question, 'salud', 'Salud', 5),
    (v_question, 'banca', 'Banca', 6);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'otro_rubro', 'OTRO RUBRO:', null,
          'short_text', false, 3,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "other_for": "rubro_trabajo"}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'pertinencia_trabajo', 'En su actual puesto de trabajo las labores que se encuentra desempeñando son pertinentes a su formación como Ingeniero de Sistemas.', null,
          'likert', true, 4,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "scores": {"totalmente_desacuerdo": 1, "en_desacuerdo": 2, "de_acuerdo": 3, "totalmente_acuerdo": 4}}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_desacuerdo', 'Totalmente en desacuerdo', 1),
    (v_question, 'en_desacuerdo', 'En desacuerdo', 2),
    (v_question, 'de_acuerdo', 'De acuerdo', 3),
    (v_question, 'totalmente_acuerdo', 'Totalmente de Acuerdo', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'sector_trabajo', 'EL TRABAJO EN EL QUE SE ENCUENTRA, ¿A QUÉ SECTOR CORRESPONDE?', null,
          'single_choice', true, 5,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'publico', 'PÚBLICO', 1),
    (v_question, 'privado', 'PRIVADO', 2);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'departamento_trabajo', '¿EN QUÉ DEPARTAMENTO DE BOLIVIA TRABAJA?', null,
          'single_choice', true, 6,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'cochabamba', 'COCHABAMBA', 1),
    (v_question, 'chuquisaca', 'CHUQUISACA', 2),
    (v_question, 'tarija', 'TARIJA', 3),
    (v_question, 'la_paz', 'LA PAZ', 4),
    (v_question, 'oruro', 'ORURO', 5),
    (v_question, 'potosi', 'POTOSI', 6),
    (v_question, 'santa_cruz', 'SANTA CRUZ', 7),
    (v_question, 'beni', 'BENI', 8),
    (v_question, 'pando', 'PANDO', 9),
    (v_question, 'extranjero', 'EXTRANJERO', 10);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'area_trabajo', '¿CUÁL ES EL ÁREA DENTRO DE LA ORGANIZACIÓN DONDE DESARROLLA SUS ACTIVIDADES PROFESIONALES?', null,
          'single_choice', false, 7,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "other_question": "otra_area", "require_one_of": ["area_trabajo", "otra_area"]}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'contabilidad', 'contabilidad', 1),
    (v_question, 'administracion', 'administración', 2),
    (v_question, 'computo', 'computo', 3),
    (v_question, 'desarrollo', 'desarrollo', 4),
    (v_question, 'rrhh', 'r.r.h.h', 5);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'otra_area', 'OTR@ AREA:', null,
          'short_text', false, 8,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "other_for": "area_trabajo"}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'cargo_trabajo', '¿Cuál es el cargo que desempeña en su actual trabajo?', null,
          'single_choice', false, 9,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "other_question": "otro_cargo", "require_one_of": ["cargo_trabajo", "otro_cargo"]}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'ejecutivo', 'Ejecutivo', 1),
    (v_question, 'tecnico', 'Técnico', 2),
    (v_question, 'desarrollo', 'Desarrollo', 3),
    (v_question, 'help_desk', 'Help Desk', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'otro_cargo', 'OTR@ CARGO:', null,
          'short_text', false, 10,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "other_for": "cargo_trabajo"}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'antiguedad_trabajo', '¿Qué antigüedad tiene en su actual trabajo?', null,
          'single_choice', true, 11,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'menos_1', 'Menos de 1 año', 1),
    (v_question, '1_2', 'Entre 1 a 2 años', 2),
    (v_question, '2_5', 'Entre 2 a 5 años', 3),
    (v_question, '5_8', 'Entre 5 a 8 años', 4),
    (v_question, '8_11', 'Entre 8 a 11 años', 5),
    (v_question, '11_15', 'Entre 11 a 15 años', 6),
    (v_question, '15_20', 'Entre 15 a 20 años', 7),
    (v_question, '20_25', 'Entre 20 a 25 años', 8),
    (v_question, 'mas_25', 'más de 25 años', 9);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'medio_obtencion', '¿A través de qué medio obtuvo el trabajo que actualmente desempeña?', null,
          'single_choice', true, 12,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'medios_escritos', 'MEDIOS ESCRITOS O AUDIOVISUALES', 1),
    (v_question, 'internet', 'INTERNET Y REDES SOCIALES', 2),
    (v_question, 'postulacion', 'POSTULACIÓN COMPETITIVA (CONVOCATORIAS PÚBLICAS Y PRIVADAS)', 3),
    (v_question, 'recomendacion', 'RECOMENDACIÓN DE TERCEROS', 4),
    (v_question, 'otros', 'OTROS', 5);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'remuneracion', 'Señale la remuneración promedio mensual que está percibiendo en su actual trabajo.', null,
          'single_choice', true, 13,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "eq": "trabaja"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'menos_2500', 'Menor a Bs. 2500', 1),
    (v_question, '2500_3500', 'Entre Bs. 2.500 - Bs. 3.500', 2),
    (v_question, '3501_5000', 'Entre Bs. 3.501 - Bs. 5.000', 3),
    (v_question, '5001_7000', 'Entre Bs. 5.001 - Bs. 7.000', 4),
    (v_question, '7001_10000', 'Entre Bs. 7.001 - Bs. 10.000', 5),
    (v_question, 'mas_10000', 'Más de Bs. 10.000', 6);

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'Situación sin empleo', null, 4)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'razon_no_trabaja', 'Indique cuál es la razón por la que actualmente no trabaja en un empleo relacionado con su formación como Ingeniero de Sistemas', null,
          'single_choice', true, 1,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "eq": "no_trabaja"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'demanda_inexistente', 'Demanda laboral inexistente.', 1),
    (v_question, 'experiencia_previa', 'Incumplimiento de requisitos de experiencia previa.', 2),
    (v_question, 'habilidades_especificas', 'Incumplimiento de requisitos en habilidades específicas (idiomas, softwares, etc).', 3),
    (v_question, 'red_contactos', 'Red de contactos limitada.', 4),
    (v_question, 'presentacion_cv', 'Problemas de presentación del CV.', 5),
    (v_question, 'entrevistas', 'Habilidades deficientes en las entrevistas.', 6),
    (v_question, 'remuneracion_baja', 'Ofertas laborales con remuneración muy bajas.', 7),
    (v_question, 'otro', 'Otro', 8);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'trabajo_antes', 'Si bien actualmente no trabaja, ¿Ha tenido algún trabajo antes?', null,
          'single_choice', true, 2,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "eq": "no_trabaja"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'si', 'SI', 1),
    (v_question, 'no', 'NO', 2);

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'Emprendimiento', null, 5)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'origen_emprendimiento', '¿Cuál es el origen del desarrollo de su propio emprendimiento?', null,
          'single_choice', true, 1,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "eq": "emprende"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'idea_propia', 'Idea propia.', 1),
    (v_question, 'idea_conjunta', 'Idea conjunta con compañeros.', 2),
    (v_question, 'startup', 'StartUp', 3),
    (v_question, 'spin_off', 'Spin Off (derivado de un proyecto de la Universidad)', 4),
    (v_question, 'otro', 'Otro.', 5);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'entregable_negocio', '¿Qué tipo de entregable genera el negocio?', null,
          'single_choice', true, 2,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "eq": "emprende"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'producto', 'Producto', 1),
    (v_question, 'servicio', 'Servicio', 2),
    (v_question, 'ambos', 'Ambos', 3);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'financiamiento_negocio', '¿Ha requerido financiamiento externo para su negocio?', null,
          'single_choice', true, 3,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "eq": "emprende"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'prestamos', 'Si, mediante préstamos bancarios.', 1),
    (v_question, 'inversores', 'Si, mediante inversores.', 2),
    (v_question, 'propio', 'No, financiamiento propio.', 3);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'satisfaccion_negocio', '¿Qué tan satisfecho está con el rendimiento actual de su negocio?', null,
          'likert', true, 4,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "scores": {"insatisfecho": 1, "algo_satisfecho": 2, "satisfecho": 3}}'::jsonb,
          '{"q": "situacion_laboral", "eq": "emprende"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'insatisfecho', 'Insatisfecho', 1),
    (v_question, 'algo_satisfecho', 'Algo satisfecho', 2),
    (v_question, 'satisfecho', 'Satisfecho', 3);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'importancia_formacion_negocio', '¿Qué tan importante considera que fue su formación en Ingeniería en Sistemas para iniciar y gestionar su negocio?', null,
          'likert', true, 5,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "scores": {"no_importante": 1, "poco_importante": 2, "importante": 3, "muy_importante": 4}}'::jsonb,
          '{"q": "situacion_laboral", "eq": "emprende"}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'no_importante', 'No es importante', 1),
    (v_question, 'poco_importante', 'Poco Importante', 2),
    (v_question, 'importante', 'Importante', 3),
    (v_question, 'muy_importante', 'Muy importante', 4);

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'Trayectoria laboral', null, 6)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'primer_empleo', '¿El trabajo que ejerce actualmente es su primer empleo?', null,
          'single_choice', true, 1,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"q": "situacion_laboral", "in": ["trabaja", "emprende"]}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'si', 'SI', 1),
    (v_question, 'no', 'NO', 2);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'tiempo_primer_trabajo', 'Luego de titularse, ¿Cuánto tiempo se demoró en conseguir su primer trabajo relacionado con su formación como Ingeniero en Sistemas?', null,
          'single_choice', true, 2,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": "En la rama ''trabaja'' el PDF no muestra qué sigue a primer_empleo; se asume igual que en ''emprende''. Confirmar."}'::jsonb,
          '{"any": [{"q": "situacion_laboral", "in": ["trabaja", "emprende"]}, {"all": [{"q": "situacion_laboral", "eq": "no_trabaja"}, {"q": "trabajo_antes", "eq": "si"}]}]}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'ya_trabajaba', 'Ya trabajaba antes de titularse', 1),
    (v_question, 'menos_1_mes', 'Menos de 1 mes', 2),
    (v_question, '1_4_meses', 'Entre 1 - 4 meses', 3),
    (v_question, '4_8_meses', 'Entre 4 - 8 meses', 4),
    (v_question, '8_12_meses', 'Entre 8 - 12 meses', 5),
    (v_question, 'mas_12_meses', 'Más de 12 meses', 6);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'numero_empleos', 'Desde que se tituló, ¿en cuántos empleos usted se ha desempeñado? (Incluyendo su actual empleo si corresponde)', null,
          'single_choice', true, 3,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          '{"any": [{"q": "situacion_laboral", "in": ["trabaja", "emprende"]}, {"all": [{"q": "situacion_laboral", "eq": "no_trabaja"}, {"q": "trabajo_antes", "eq": "si"}]}]}'::jsonb)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, '1', '1', 1),
    (v_question, '2', '2', 2),
    (v_question, '3', '3', 3),
    (v_question, 'mas_3', 'Más de 3', 4);

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'Valoración de la carrera', null, 7)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'satisfaccion_carrera', 'De manera global ¿Cuál es el grado de satisfacción que ha desarrollado con la formación profesional recibida en la Carrera de Ingenieria de Sistemas', null,
          'likert', true, 1,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "scores": {"totalmente_desacuerdo": 1, "en_desacuerdo": 2, "de_acuerdo": 3, "totalmente_acuerdo": 4}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_desacuerdo', 'Totalmente en desacuerdo', 1),
    (v_question, 'en_desacuerdo', 'En desacuerdo', 2),
    (v_question, 'de_acuerdo', 'De acuerdo', 3),
    (v_question, 'totalmente_acuerdo', 'Totalmente de Acuerdo', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'concordancia_formacion', 'Considera que existe concordancia entre la formación profesional recibida en la Carrera de Ingeniería de Sistemas y los requerimientos', null,
          'likert', true, 2,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": "Enunciado incompleto en el formulario original.", "scores": {"totalmente_desacuerdo": 1, "en_desacuerdo": 2, "de_acuerdo": 3, "totalmente_acuerdo": 4}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_desacuerdo', 'Totalmente en desacuerdo', 1),
    (v_question, 'en_desacuerdo', 'En desacuerdo', 2),
    (v_question, 'de_acuerdo', 'De acuerdo', 3),
    (v_question, 'totalmente_acuerdo', 'Totalmente de Acuerdo', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'aspectos_utiles', '¿Qué aspectos de la Carrera les resultaron de bastante utilidad?', null,
          'multiple_choice', true, 3,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'aplicacion_practica', 'La aplicación práctica de conceptos teóricos en proyectos reales.', 1),
    (v_question, 'pasantias', 'La oportunidad de realizar pasantías o prácticas profesionales.', 2),
    (v_question, 'horarios', 'La distribución de los horarios de clases.', 3),
    (v_question, 'habilidades_analiticas', 'El desarrollo de habilidades analíticas y de resolución de problemas.', 4),
    (v_question, 'equipos_multidisciplinarios', 'La colaboración de equipos multidisciplinarios para resolver problemas complejos.', 5),
    (v_question, 'herramientas_industria', 'La enseñanza de herramientas y software específico de la industria.', 6);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'aspectos_mejorar', '¿Qué aspectos de la Carrera considera que pueden mejorarse?', null,
          'multiple_choice', true, 4,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'teoria_practica', 'Mayor integración de la teoría con aplicaciones prácticas en el plan de estudios.', 1),
    (v_question, 'relacion_empresas', 'Mayor relacionamiento del estudiante con las empresas por medio de práctica profesionales.', 2),
    (v_question, 'horarios', 'La distribución de horarios de clases. (Horario para trabajadores, módulos virtuales, etc)', 3),
    (v_question, 'actualizacion_plan', 'Actualización constante del plan de estudios para atender tendencias actuales.', 4),
    (v_question, 'extracurriculares', 'Incremento de actividades extracurriculares (Investigación, servicio social, etc)', 5),
    (v_question, 'especializacion', 'Ofrecimiento de más opciones de especialización.', 6);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'asignaturas_ventaja', 'Indique 5 asignaturas cursadas en la Carrera que considera que le brindaron una ventaja competitiva al momento de buscar trabajo o desenvolverse profesionalmente.', 'Seleccione 5 opciones.',
          'multiple_choice', true, 5,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "min_selected": 5, "max_selected": 5, "other_question": "otra_ventaja"}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'introduccion', 'Introducción', 1),
    (v_question, 'base_datos', 'Base de Datos', 2),
    (v_question, 'ia', 'Inteligencia Artificial', 3),
    (v_question, 'redes', 'Redes de Computadora', 4),
    (v_question, 'electivas', 'Electivas', 5),
    (v_question, 'tis', 'T.I.S.', 6),
    (v_question, 'basicas', 'Básicas (Física, Calculo, Algebras)', 7),
    (v_question, 'planificacion', 'Planificación de Proyectos y Gestión', 8),
    (v_question, 'redes_avanzadas', 'Tecnologia Redes Avanzadas', 9);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'otra_ventaja', 'Otra asignatura:', null,
          'short_text', false, 6,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "other_for": "asignaturas_ventaja"}'::jsonb,
          null)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'asignaturas_no_utiles', 'Indique 5 asignaturas cursadas en la Carrera que no le resultaron de mucha utilidad en su vida profesional.', 'Seleccione 5 opciones.',
          'multiple_choice', true, 7,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": "El formulario dice ''Seleccione 5''; el anexo de la guía dice ''Seleccione 2''. Se usa 5 (formulario real).", "min_selected": 5, "max_selected": 5, "other_question": "otra_no_util"}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'basicas', 'Básicas (Física, Calculo, Algebras)', 1),
    (v_question, 'tv_digital', 'Aplic. Interactivas para Televisión Digital', 2),
    (v_question, 'telefonia_ip', 'Telefonía IP', 3),
    (v_question, 'web_semanticas', 'Web Semánticas', 4),
    (v_question, 'graficacion', 'Graficación por Computadora', 5),
    (v_question, 'robotica', 'Robótica', 6),
    (v_question, 'bajo_nivel', 'Taller de Programación en Bajo Nivel', 7),
    (v_question, 'automatas', 'Teoría de Autómatas y Leng. Formales', 8),
    (v_question, 'funcional', 'Programación Funcional', 9),
    (v_question, 'grafos', 'Teoría de Grafos', 10),
    (v_question, 'contabilidad', 'Contabilidad Básica', 11);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'otra_no_util', 'Otra asignatura:', null,
          'short_text', false, 8,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "other_for": "asignaturas_no_utiles"}'::jsonb,
          null)
  returning id into v_question;

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'Red de contactos', null, 8)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'interes_red', '¿Le interesaría formar parte una red de contactos oficial de la Carrera de Ingeniería en Sistemas para compartir experiencias, proyectos y ofertas laborales?', null,
          'single_choice', true, 1,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'si', 'SI', 1),
    (v_question, 'no', 'NO', 2);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'email', 'Email de contacto:', null,
          'email', true, 2,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "store": "contact", "contact_field": "email"}'::jsonb,
          '{"q": "interes_red", "eq": "si"}'::jsonb)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'telefono', 'Número telefónico de contacto:', 'DE PREFERENCIA CON ACCESO A WHATSAPP',
          'short_text', false, 3,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "store": "contact", "contact_field": "phone", "input": "phone"}'::jsonb,
          '{"q": "interes_red", "eq": "si"}'::jsonb)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'linkedin', 'LINK de LinkedIn', null,
          'short_text', false, 4,
          '{"source": "encuesta.pdf (capturas del formulario Microsoft Forms)", "source_note": null, "store": "contact", "contact_field": "linkedin_url", "input": "url"}'::jsonb,
          '{"q": "interes_red", "eq": "si"}'::jsonb)
  returning id into v_question;

  -- ===================== empleadores v1 =====================
  select sv.id, sv.status into v_version, v_status
    from tss_survey_versions sv join tss_surveys s on s.id = sv.survey_id
   where s.slug = 'empleadores' and sv.version_number = 1;
  if v_version is null then raise exception 'No existe empleadores v1'; end if;
  if v_status <> 'draft' then raise exception 'empleadores v1 no está en draft (%)', v_status; end if;
  if exists (select 1 from tss_submissions where survey_version_id = v_version) then
    raise exception 'empleadores v1 ya tiene envíos: no se regenera el catálogo';
  end if;

  delete from tss_question_options where question_id in (
    select q.id from tss_questions q join tss_sections se on se.id = q.section_id
     where se.survey_version_id = v_version);
  delete from tss_questions where section_id in
    (select id from tss_sections where survey_version_id = v_version);
  delete from tss_sections where survey_version_id = v_version;

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'Información de la organización', null, 1)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'correo', 'Correo', null,
          'email', true, 1,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "store": "contact", "contact_field": "email"}'::jsonb,
          null)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'nombre_empresa', '1) Nombre de la Empresa o Institución', null,
          'short_text', true, 2,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'tipo_organizacion', '2) Tipo de organización', null,
          'single_choice', true, 3,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'publico', 'Público', 1),
    (v_question, 'privado', 'Privado', 2);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'tamano_organizacion', '3) Tamaño de la organización', null,
          'single_choice', true, 4,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'grande', 'Grande (100 funcionarios o más)', 1),
    (v_question, 'mediana', 'Mediana (entre 31 a 99 funcionarios)', 2),
    (v_question, 'pequena', 'Pequeña (entre 11 a 30 funcionarios)', 3),
    (v_question, 'micro', 'Micro (hasta 10 funcionarios)', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'rubro', '4) Indique el rubro o sector principal de la organización en la que se desempeña laboralmente el profesional titulado de la Carrera de Ingeniería de Sistemas.', null,
          'single_choice', true, 5,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'desarrollo_software', 'Desarrollo de software', 1),
    (v_question, 'servicios_ti', 'Servicios de tecnologías de información (TI)', 2),
    (v_question, 'telecomunicaciones', 'Telecomunicaciones y redes', 3),
    (v_question, 'soporte_tecnico', 'Soporte técnico y mantenimiento de sistemas', 4),
    (v_question, 'consultoria', 'Consultoría en sistemas / transformación digital', 5),
    (v_question, 'banca', 'Banca y servicios financieros', 6),
    (v_question, 'sector_publico', 'Instituciones públicas / gobierno', 7),
    (v_question, 'educacion', 'Educación e investigación', 8),
    (v_question, 'industria', 'Industria y manufactura', 9),
    (v_question, 'comercio', 'Comercio y comercio electrónico', 10),
    (v_question, 'salud', 'Salud', 11),
    (v_question, 'ciberseguridad', 'Seguridad informática / ciberseguridad', 12),
    (v_question, 'datos_bi', 'Análisis de datos / inteligencia de negocios', 13),
    (v_question, 'startups', 'Startups o emprendimientos tecnológicos', 14),
    (v_question, 'otros', 'Otros', 15);

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'EMPLEABILIDAD', 'Se busca conocer la demanda laboral, oportunidades de contratación y desempeño de los profesionales titulados de Ingeniería de Sistemas en las organizaciones, con el fin de evaluar la pertinencia de la formación profesional frente a las necesidades del entorno laboral.', 2)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'contrataciones_cinco_anios', '5) ¿La organización ha contratado Ingenieros de la carrera de Sistemas en los últimos 5 años?', null,
          'single_choice', true, 1,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'si', 'SI', 1),
    (v_question, 'no', 'No', 2);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'probabilidad_contratar', '6) Considerando las necesidades actuales y proyectadas de la organización, ¿existe la posibilidad de incorporar Ingenieros de Sistemas en su equipo de trabajo durante los próximos años?', null,
          'single_choice', true, 2,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'alta', 'Sí, existe una alta probabilidad de contratación', 1),
    (v_question, 'depende_crecimiento', 'Sí, dependiendo del crecimiento o nuevos proyectos de la organización', 2),
    (v_question, 'no_prevista', 'No se tiene prevista la contratación actualmente', 3),
    (v_question, 'no_requiere', 'No requiere profesionales del área de Sistemas', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'nivel_formacion', '7) ¿Qué nivel de formación académica o actualización profesional, demanda su organización para contratar nuevos profesionales del área?', null,
          'single_choice', true, 3,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'licenciatura', 'Licenciatura', 1),
    (v_question, 'diplomado', 'Diplomado', 2),
    (v_question, 'especialidad', 'Especialidad', 3),
    (v_question, 'maestria', 'Maestría', 4),
    (v_question, 'doctorado', 'Doctorado', 5),
    (v_question, 'posdoctorado', 'Post- doctorado', 6);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'medio_convocatoria', '8) ¿A través de qué medio convoca a profesionales en su organización (empresa o institución)?', null,
          'single_choice', true, 4,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": "Obligatoria según la captura del formulario (el anexo de la guía no tiene asterisco)."}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'medios_escritos', 'Medios escritos y audiovisuales', 1),
    (v_question, 'internet', 'Internet y Redes sociales', 2),
    (v_question, 'postulacion', 'Postulación competitiva (convocatorias públicas y privadas)', 3),
    (v_question, 'oferta_personal', 'Oferta profesional personal', 4),
    (v_question, 'recomendacion', 'Recomendación de terceros', 5),
    (v_question, 'otros', 'Otros', 6);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'cargos', '9) ¿Qué tipo de cargos desempeñan los profesionales titulados de la Carrera de Ingeniería de Sistemas en su organización?', '(Puede seleccionar más de una opción)',
          'multiple_choice', true, 5,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "min_selected": 1, "other_question": "otro_cargo"}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'apoyo', 'De apoyo / asistencia tecnológica', 1),
    (v_question, 'tecnico', 'Técnico (desarrollo de software, administración de sistemas, redes, bases de datos, soporte TI)', 2),
    (v_question, 'analista', 'Analista (sistemas, datos, procesos o soluciones tecnológicas)', 3),
    (v_question, 'especialista', 'Especialista (ciberseguridad, arquitectura de software, infraestructura tecnológica, entre otros)', 4),
    (v_question, 'supervisor', 'Supervisor / Coordinador de área tecnológica', 5),
    (v_question, 'jefatura', 'Jefatura o Gerencial (gestión de proyectos, dirección de TI, transformación digital)', 6),
    (v_question, 'consultor', 'Consultor tecnológico', 7);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'otro_cargo', 'Otro:', null,
          'short_text', false, 6,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "other_for": "cargos"}'::jsonb,
          null)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'nuevas_areas', '10) Desde su experiencia en el sector laboral, ¿qué nuevas áreas de conocimiento, tecnologías o tendencias emergentes considera importantes para la formación del profesional de Ingeniería de Sistemas?', null,
          'long_text', true, 7,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'nuevas_herramientas', '11) ¿Cuáles son las nuevas herramientas tecnológicas (software, plataformas o entornos de desarrollo) que, a su criterio, debería conocer y manejar el profesional titulado de la Carrera de Ingeniería de Sistemas?', null,
          'long_text', true, 8,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'competencias', '12) Desde su experiencia en el ámbito laboral, ¿qué habilidades, competencias y destrezas considera fundamentales que debe desarrollar el profesional de Ingeniería de Sistemas para responder adecuadamente a las necesidades de la organización y del mercado laboral?', null,
          'long_text', true, 9,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null}'::jsonb,
          null)
  returning id into v_question;

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'FORMACIÓN Y PERFIL PROFESIONAL', 'Se busca conocer la valoración de los empleadores sobre la formación, competencias y desempeño profesional de los titulados de Ingeniería de Sistemas, con el propósito de fortalecer la calidad académica y adecuar el perfil profesional a las necesidades del mercado laboral.', 3)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'perfil_01', 'La Carrera de Ingeniería de Sistemas de la Universidad Mayor de San Simón brinda confianza a nuestra organización como formadora de profesionales del área tecnológica.', null,
          'likert', true, 1,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'perfil_02', 'Considero que el título profesional otorgado por la Carrera de Ingeniería de Sistemas es consistente con el nivel de formación y las competencias demostradas por sus titulados.', null,
          'likert', true, 2,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'perfil_03', 'Las autoridades de la Carrera de Ingeniería de Sistemas consultan regularmente nuestra opinión como empleadores respecto al perfil profesional y las competencias requeridas en el ámbito laboral.', null,
          'likert', true, 3,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'perfil_04', 'Conozco el perfil profesional y las competencias de egreso declaradas por la Carrera de Ingeniería de Sistemas.', null,
          'likert', true, 4,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'perfil_05', 'El perfil profesional declarado por la Carrera de Ingeniería de Sistemas es coherente con el desempeño laboral demostrado por sus titulados.', null,
          'likert', true, 5,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'perfil_06', 'La formación proporcionada por la Carrera de Ingeniería de Sistemas permite a sus titulados alcanzar un desempeño destacado tanto en el ámbito profesional como en su formación integral.', null,
          'likert', true, 6,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'perfil_07', 'La Carrera de Ingeniería de Sistemas considera nuestra opinión como empleadores e incorpora las necesidades del sector laboral en la definición y mejora de actividades de formación práctica, pasantías y modalidades de titulación.', null,
          'likert', true, 7,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'perfil_08', 'El desempeño profesional de los titulados de Ingeniería de Sistemas evidencia el desarrollo de competencias laborales como: comunicación efectiva, análisis y resolución de problemas, pensamiento crítico, aprendizaje continuo, trabajo en equipo, iniciativa personal y manejo adecuado de tecnologías de información.', null,
          'likert', true, 8,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'perfil_09', 'Los profesionales titulados de Ingeniería de Sistemas demuestran valores y actitudes relacionados con la ética profesional, responsabilidad social, inclusión, diversidad, respeto a los derechos humanos y compromiso con el medio ambiente.', null,
          'likert', true, 9,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'perfil_10', 'He participado en procesos de recopilación de información, evaluación o retroalimentación relacionados con el desempeño laboral de los titulados de la Carrera de Ingeniería de Sistemas.', null,
          'likert', true, 10,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_sections (survey_version_id, title, description, position)
  values (v_version, 'RELACIÓN DE LA CARRERA CON LA ORGANIZACIÓN', 'Esta sección tiene como objetivo conocer la relación entre la Carrera de Ingeniería de Sistemas y las organizaciones del sector laboral, así como su participación en actividades de vinculación y retroalimentación.', 4)
  returning id into v_section;

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'relacion_01', 'La Carrera de Ingeniería de Sistemas mantiene vínculos con organizaciones e instituciones que generan oportunidades laborales para sus titulados.', null,
          'likert', true, 1,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'relacion_02', 'He participado en actividades de vinculación con el entorno laboral y tecnológico organizadas por la Carrera de Ingeniería de Sistemas o la Facultad de Ciencias y Tecnología.', null,
          'likert', true, 2,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'relacion_03', 'He participado en actividades de difusión de oportunidades laborales, convocatorias, pasantías o prácticas profesionales organizadas por la Carrera de Ingeniería de Sistemas.', null,
          'likert', true, 3,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'relacion_04', 'He participado en actividades de vinculación entre profesionales del sector tecnológico, empleadores, docentes y estudiantes de la Carrera de Ingeniería de Sistemas para el intercambio de conocimientos, experiencias y desarrollo de trabajos conjuntos.', null,
          'likert', true, 4,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'relacion_05', 'Como empleador, he sido consultado sobre el desempeño profesional de los titulados de Ingeniería de Sistemas, con el propósito de retroalimentar el perfil profesional y el plan de estudios de la Carrera.', null,
          'likert', true, 5,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'relacion_06', 'Como empleador, la Carrera de Ingeniería de Sistemas ha consultado nuestra opinión respecto a la pertinencia de la formación impartida y su correspondencia con las necesidades del sector tecnológico y laboral.', null,
          'likert', true, 6,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'relacion_07', 'Cuando nuestra organización requiere profesionales del área de Sistemas, recurrimos a la Universidad Mayor de San Simón y a la Carrera de Ingeniería de Sistemas como fuente de búsqueda de talento profesional.', null,
          'likert', true, 7,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": null, "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);

  insert into tss_questions (section_id, code, prompt, help_text, question_type,
                             required, position, configuration, display_condition)
  values (v_section, 'relacion_08', 'He sido consultado periódicamente por la Carrera de Ingeniería de Sistemas durante sus procesos de autoevaluación y mejora continua.', null,
          'likert', true, 8,
          '{"source": "encuesta.pdf (capturas del formulario Google Forms)", "source_note": "Último ítem visible en las capturas; confirmar si la sección tiene más ítems o termina en Enviar.", "scores": {"totalmente_acuerdo": 3, "parcialmente_acuerdo": 2, "totalmente_desacuerdo": 1}}'::jsonb,
          null)
  returning id into v_question;
  insert into tss_question_options (question_id, value, label, position) values
    (v_question, 'totalmente_acuerdo', 'Totalmente de acuerdo', 1),
    (v_question, 'parcialmente_acuerdo', 'Parcialmente de acuerdo', 2),
    (v_question, 'totalmente_desacuerdo', 'Totalmente desacuerdo', 3),
    (v_question, 'no_sabe', 'No sabe', 4);
end
$catalogo$;
