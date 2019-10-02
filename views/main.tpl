<html>
<head>
  <title>{% block title %}Default Title{% endblock %}</title>
  <link rel="htmlmap" src="{%= html_map_url %}">
  {% block head %}{% endblock %}
</head>
<body>
  {% block content %}Default Content{% endblock %}
</body>
</html>
