package app.horario.estudio;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppHorarioHttpPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
