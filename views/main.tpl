<html>
<head>
  <title>{% block title %}Default Title{% endblock %}</title>
  <link rel="map" src="{%= html_map_url %}"></link>
  {% block head %}{% endblock %}
</head>
<body>
  {% block content %}Default Content{% endblock %}
</body>
</html>
