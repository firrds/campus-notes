pipeline {
  agent any

  environment {
    REGISTRY = '192.168.3.10:5000'
    IMAGE    = "${REGISTRY}/devops-01/campus-notes"
    TAG      = "${env.BUILD_NUMBER}"
    DEPLOY_HOST = 'ubuntu@192.168.3.101'
  }

  options {
    timeout(time: 15, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  // Webhooks cannot reach this network -- vm-ci is on a private address.
  triggers { pollSCM('H/2 * * * *') }

  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Build image') {
      steps { sh 'docker build -t $IMAGE:$TAG -t $IMAGE:latest .' }
    }
    stage('Unit tests') {
      steps {
        sh '''
          docker run --rm \
            -v jenkins-data:/var/jenkins_home:ro \
            -e SRC="$WORKSPACE" \
            node:24-slim \
            sh -c '
              mkdir /app
              cp -a "$SRC"/. /app/
              cd /app
              npm ci
              npm test
            '
        '''
      }
    }

    stage('SAST') {
      steps {
        sh '''
          docker run --rm \
            -v jenkins-data:/var/jenkins_home:ro \
            -w "$WORKSPACE" \
            semgrep/semgrep:${SEMGREP_TAG} \
            semgrep \
              --config .semgrep/rules.yml \
              --error \
              src
        '''
      }
    }
    stage('Dependency audit') {
      steps {
        sh '''
          docker run --rm \
            -v jenkins-data:/var/jenkins_home:ro \
            -e SRC="$WORKSPACE" \
            node:24-slim \
            sh -c '
              mkdir /app
              cp "$SRC/package.json" "$SRC/package-lock.json" /app/
              cd /app
              npm ci
              npm audit --audit-level=high
            '
        '''
      }
    }

    stage('Smoke test') {
      steps {
        sh '''
          name="campus-notes-smoke-${BUILD_NUMBER}"
          trap 'docker rm -f "$name" >/dev/null 2>&1 || true' EXIT
          docker run -d --name "$name" -e SESSION_SECRET=smoke-only "$IMAGE:$TAG"
          for i in $(seq 1 20); do
            if docker exec "$name" /nodejs/bin/node -e \
                 "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
              echo "healthy after ${i}s"; exit 0
            fi
            sleep 1
          done
          echo "never became healthy"; docker logs "$name"; exit 1
        '''
      }
    }

    stage('Push') {
      steps { sh 'docker push $IMAGE:$TAG && docker push $IMAGE:latest' }
    }

    stage('Deploy to vm-app') {
      steps {
        sshagent(credentials: ['vm-app-01']) {
          withCredentials([string(credentialsId: 'campus-notes-secret-01', variable: 'SESSION_SECRET')]) {
            sh '''
              ssh -o StrictHostKeyChecking=accept-new ubuntu@192.168.3.101 "
                docker pull $IMAGE:$TAG &&
                (docker rm -f campus-notes 2>/dev/null || true) &&
                docker run -d --name campus-notes --restart=unless-stopped \
                  -e SESSION_SECRET=$SESSION_SECRET \
                  -p 3000:3000 $IMAGE:$TAG
              "
            '''
          }
        }
      }
    }

  }

  post {
    failure {
      echo 'Pipeline failed. Read which stage failed before changing anything.'
    }
  }
}
